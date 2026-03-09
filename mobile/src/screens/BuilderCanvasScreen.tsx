import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import Svg, { Line } from 'react-native-svg';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Undo2,
  Redo2,
  Play,
  Settings2,
  X,
  Search,
  ZoomIn,
  ZoomOut,
} from 'lucide-react-native';
import { workflowsApi, executionsApi } from '../lib/api/endpoints';
import { nodeDefinitions, categoryOrder, categoryLabels } from '../lib/nodeDefinitions';
import { getInputsOutputs } from '../lib/nodeDefinitionsHandles';
import { getFieldsForType } from '../lib/nodeDefinitionsFields';
import { colors } from '../theme/colors';
import { BuilderInspector, type InspectorTab, type CanvasNode, type CanvasEdge } from '../components/builder/BuilderInspector';

type Route = RouteProp<RootStackParamList, 'BuilderCanvas'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'BuilderCanvas'>;

const CANVAS_SIZE = 3000;
const NODE_WIDTH = 160;
const NODE_HEIGHT = 56;
const HANDLE_SIZE = 24;

function getNodeTitle(node: CanvasNode): string {
  return node.data?.definition?.title ?? node.type ?? node.id;
}

function wouldCreateCycle(edges: CanvasEdge[], sourceId: string, targetId: string): boolean {
  if (sourceId === targetId) return true;
  const outgoing = edges.filter((e) => e.source === targetId);
  return outgoing.some((e) => wouldCreateCycle(edges, sourceId, e.target));
}

const CATEGORY_ACCENT: Record<string, string> = {
  trigger: '#22c55e',
  ai: '#8b5cf6',
  voice: '#ec4899',
  video: '#f59e0b',
  social: '#06b6d4',
  logic: '#6366f1',
  utility: '#64748b',
  review: '#f59e0b',
  ideas: '#a855f7',
  text: '#14b8a6',
  script: '#0ea5e9',
};
function getCategoryAccent(category: string | undefined): string {
  return (category && CATEGORY_ACCENT[category]) || colors.border;
}

export function BuilderCanvasScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const { workflowId } = route.params;

  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [libraryVisible, setLibraryVisible] = useState(false);
  const [inspectorVisible, setInspectorVisible] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('config');
  const [metaDialogVisible, setMetaDialogVisible] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; handleId: string } | null>(null);
  const [history, setHistory] = useState<{ nodes: CanvasNode[]; edges: CanvasEdge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [latestExecutionId, setLatestExecutionId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [workflowStatus, setWorkflowStatus] = useState<string>('draft');
  const [librarySearch, setLibrarySearch] = useState('');
  const [canvasScale, setCanvasScale] = useState(1);
  const [pendingPlaceNode, setPendingPlaceNode] = useState<{ type: string; category: string; title: string } | null>(null);
  const [contentOffset, setContentOffset] = useState({ x: 0, y: 0 });
  const [scrollViewLayout, setScrollViewLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const scrollViewWrapperRef = useRef<View>(null);

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 2;
  const zoomIn = useCallback(() => setCanvasScale((s) => Math.min(MAX_SCALE, s + 0.25)), []);
  const zoomOut = useCallback(() => setCanvasScale((s) => Math.max(MIN_SCALE, s - 0.25)), []);

  const { data: workflow, isLoading, error } = useQuery({
    queryKey: ['workflows', workflowId],
    queryFn: () => workflowsApi.get(workflowId),
    enabled: !!workflowId,
  });

  const { data: executions } = useQuery({
    queryKey: ['workflows', workflowId, 'executions'],
    queryFn: () => executionsApi.list(workflowId),
    enabled: !!workflowId,
  });

  const execIdToUse = latestExecutionId ?? executions?.[0]?.id ?? null;
  const { data: runLog, isLoading: runLogLoading } = useQuery({
    queryKey: ['execution', workflowId, execIdToUse],
    queryFn: () => executionsApi.get(workflowId, execIdToUse!),
    enabled: !!workflowId && !!execIdToUse,
  });

  useEffect(() => {
    if (workflow) {
      const n = Array.isArray(workflow.nodes) ? workflow.nodes : [];
      const e = Array.isArray(workflow.edges) ? workflow.edges : [];
      setNodes(n as CanvasNode[]);
      setEdges(e as CanvasEdge[]);
      setHistory([{ nodes: n as CanvasNode[], edges: e as CanvasEdge[] }]);
      setHistoryIndex(0);
      setWorkflowName(workflow.name ?? '');
      setWorkflowDescription((workflow as { description?: string }).description ?? '');
      setWorkflowStatus((workflow as { status?: string }).status ?? 'draft');
    }
  }, [workflow?.id]);

  const pushHistory = useCallback((nextNodes: CanvasNode[], nextEdges: CanvasEdge[]) => {
    setHistory((prev) => {
      const slice = prev.slice(0, historyIndex + 1);
      slice.push({ nodes: nextNodes, edges: nextEdges });
      if (slice.length > 50) slice.shift();
      return slice;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const updateMutation = useMutation({
    mutationFn: (data: { nodes: CanvasNode[]; edges: CanvasEdge[]; name?: string; description?: string; status?: string }) =>
      workflowsApi.update(workflowId, {
        nodes: data.nodes,
        edges: data.edges,
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
      }),
    onMutate: () => setSaveStatus('saving'),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflows', workflowId] });
      setSaveStatus('saved');
      if (variables.name !== undefined) setWorkflowName(variables.name);
      if (variables.description !== undefined) setWorkflowDescription(variables.description);
      if (variables.status !== undefined) setWorkflowStatus(variables.status);
    },
    onError: (e) => {
      setSaveStatus('unsaved');
      Alert.alert('Error', (e as Error).message);
    },
  });

  const persist = useCallback(
    (nextNodes: CanvasNode[], nextEdges: CanvasEdge[]) => {
      setNodes(nextNodes);
      setEdges(nextEdges);
      updateMutation.mutate({ nodes: nextNodes, edges: nextEdges });
    },
    [updateMutation]
  );

  const addNodeAtPosition = useCallback(
    (def: { type: string; category: string; title: string }, x: number, y: number) => {
      const { inputs, outputs } = getInputsOutputs(def.type);
      const clampedX = Math.max(0, Math.min(CANVAS_SIZE - NODE_WIDTH, x));
      const clampedY = Math.max(0, Math.min(CANVAS_SIZE - NODE_HEIGHT, y));
      const newNode: CanvasNode = {
        id: `node-${Date.now()}`,
        type: def.type,
        position: { x: clampedX, y: clampedY },
        data: {
          definition: { type: def.type, category: def.category, title: def.title, inputs, outputs },
          config: {},
        },
      };
      const nextNodes = [...nodes, newNode];
      pushHistory(nextNodes, edges);
      persist(nextNodes, edges);
    },
    [nodes, edges, pushHistory, persist]
  );

  const addNode = useCallback(
    (def: { type: string; category: string; title: string }) => {
      setLibraryVisible(false);
      setLibrarySearch('');
      setPendingPlaceNode(def);
    },
    []
  );

  const handlePlaceOnCanvas = useCallback(
    (e: { nativeEvent: { pageX: number; pageY: number } }) => {
      if (!pendingPlaceNode) return;
      const { pageX, pageY } = e.nativeEvent;
      const canvasX = (contentOffset.x + (pageX - scrollViewLayout.x)) / canvasScale;
      const canvasY = (contentOffset.y + (pageY - scrollViewLayout.y)) / canvasScale;
      const x = canvasX - NODE_WIDTH / 2;
      const y = canvasY - NODE_HEIGHT / 2;
      addNodeAtPosition(pendingPlaceNode, x, y);
      setPendingPlaceNode(null);
    },
    [pendingPlaceNode, contentOffset, scrollViewLayout, canvasScale, addNodeAtPosition]
  );

  const removeNode = useCallback(() => {
    if (!selectedNodeId) return;
    const nextNodes = nodes.filter((n) => n.id !== selectedNodeId);
    const nextEdges = edges.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId);
    pushHistory(nextNodes, nextEdges);
    persist(nextNodes, nextEdges);
    setSelectedNodeId(null);
    setInspectorVisible(false);
  }, [selectedNodeId, nodes, edges, pushHistory, persist]);

  const deleteNodeById = useCallback(
    (nodeId: string) => {
      const nextNodes = nodes.filter((n) => n.id !== nodeId);
      const nextEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
      pushHistory(nextNodes, nextEdges);
      persist(nextNodes, nextEdges);
      setSelectedNodeId(null);
      setInspectorVisible(false);
    },
    [nodes, edges, pushHistory, persist]
  );

  const addEdge = useCallback(
    (sourceId: string, sourceHandle: string, targetId: string, targetHandle: string) => {
      if (sourceId === targetId) return;
      const exists = edges.some((e) => e.source === sourceId && e.target === targetId);
      if (exists) return;
      if (wouldCreateCycle(edges, sourceId, targetId)) return;
      const newEdge: CanvasEdge = {
        id: `e-${sourceId}-${targetId}-${Date.now()}`,
        source: sourceId,
        target: targetId,
        sourceHandle,
        targetHandle,
      };
      const nextEdges = [...edges, newEdge];
      pushHistory(nodes, nextEdges);
      persist(nodes, nextEdges);
      setConnectingFrom(null);
    },
    [nodes, edges, pushHistory, persist]
  );

  const removeEdge = useCallback(
    (edgeId: string) => {
      const nextEdges = edges.filter((e) => e.id !== edgeId);
      pushHistory(nodes, nextEdges);
      persist(nodes, nextEdges);
    },
    [nodes, edges, pushHistory, persist]
  );

  const duplicateNode = useCallback(() => {
    if (!selectedNodeId) return;
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (!node) return;
    const newNode: CanvasNode = {
      ...node,
      id: `node-${Date.now()}`,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      data: node.data ? { ...node.data } : undefined,
    };
    const nextNodes = [...nodes, newNode];
    pushHistory(nextNodes, edges);
    persist(nextNodes, edges);
    setSelectedNodeId(newNode.id);
  }, [selectedNodeId, nodes, edges, pushHistory, persist]);

  const toggleNodeDisabled = useCallback(() => {
    if (!selectedNodeId) return;
    const nextNodes = nodes.map((n) =>
      n.id === selectedNodeId
        ? {
            ...n,
            data: {
              ...n.data,
              status: n.data?.status === 'disabled' ? 'idle' : 'disabled',
            },
          }
        : n
    );
    pushHistory(nextNodes, edges);
    persist(nextNodes, edges);
  }, [selectedNodeId, nodes, edges, pushHistory, persist]);

  const updateNodeConfig = useCallback(
    (nodeId: string, config: Record<string, unknown>) => {
      const nextNodes = nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, config } } : n
      );
      pushHistory(nextNodes, edges);
      persist(nextNodes, edges);
    },
    [nodes, edges, pushHistory, persist]
  );

  const onDragMove = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, position } : n)));
  }, []);

  const updateNodePosition = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      const nextNodes = nodes.map((n) => (n.id === nodeId ? { ...n, position } : n));
      pushHistory(nextNodes, edges);
      persist(nextNodes, edges);
    },
    [nodes, edges, pushHistory, persist]
  );

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    setHistoryIndex(historyIndex - 1);
    setNodes(prev.nodes);
    setEdges(prev.edges);
    updateMutation.mutate({ nodes: prev.nodes, edges: prev.edges });
  }, [history, historyIndex, updateMutation]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    setHistoryIndex(historyIndex + 1);
    setNodes(next.nodes);
    setEdges(next.edges);
    updateMutation.mutate({ nodes: next.nodes, edges: next.edges });
  }, [history, historyIndex, updateMutation]);

  const runWorkflow = useCallback(() => {
    updateMutation.mutate(
      { nodes, edges },
      {
        onSuccess: () => {
          workflowsApi.execute(workflowId).then((exec) => {
            setLatestExecutionId(exec.id);
            queryClient.invalidateQueries({ queryKey: ['workflows', workflowId, 'executions'] });
            setInspectorVisible(true);
            setInspectorTab('logs');
          }).catch((e) => Alert.alert('Run failed', (e as Error).message));
        },
      }
    );
  }, [workflowId, nodes, edges, updateMutation, queryClient]);

  const saveMeta = useCallback(
    (name: string, description: string, status: string) => {
      updateMutation.mutate({ nodes, edges, name, description, status });
      setMetaDialogVisible(false);
    },
    [nodes, edges, updateMutation]
  );

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const handleOutputPress = useCallback(
    (nodeId: string, handleId: string) => {
      setConnectingFrom({ nodeId, handleId });
    },
    []
  );

  const handleInputPress = useCallback(
    (nodeId: string, handleId: string) => {
      if (!connectingFrom) {
        setSelectedNodeId(nodeId);
        setInspectorVisible(true);
        return;
      }
      if (connectingFrom.nodeId === nodeId) {
        setConnectingFrom(null);
        return;
      }
      addEdge(connectingFrom.nodeId, connectingFrom.handleId, nodeId, handleId);
    },
    [connectingFrom, addEdge]
  );

  if (isLoading && !workflow) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.subtitle}>Loading workflow…</Text>
      </View>
    );
  }
  if (error || !workflow) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Workflow not found</Text>
        <TouchableOpacity style={styles.backBtnStandalone} onPress={() => nav.goBack()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.titleWrap} onPress={() => setMetaDialogVisible(true)}>
          <Text style={styles.title} numberOfLines={1}>{workflowName || workflow.name}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{workflowStatus}</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.saveStatus}>{saveStatus === 'saving' ? '…' : saveStatus === 'saved' ? '✓' : '●'}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={undo} disabled={historyIndex <= 0}>
          <Undo2 color={historyIndex <= 0 ? colors.textSecondary : colors.text} size={22} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={redo} disabled={historyIndex >= history.length - 1}>
          <Redo2 color={historyIndex >= history.length - 1 ? colors.textSecondary : colors.text} size={22} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setMetaDialogVisible(true)}>
          <Settings2 color={colors.text} size={22} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.runBtn} onPress={runWorkflow} disabled={saveStatus === 'saving'}>
          <Play color="#fff" size={20} />
          <Text style={styles.runBtnText}>Run</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={zoomOut} disabled={canvasScale <= MIN_SCALE}>
          <ZoomOut color={canvasScale <= MIN_SCALE ? colors.textSecondary : colors.text} size={22} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={zoomIn} disabled={canvasScale >= MAX_SCALE}>
          <ZoomIn color={canvasScale >= MAX_SCALE ? colors.textSecondary : colors.text} size={22} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={() => setLibraryVisible(true)}>
          <Plus color={colors.text} size={24} />
        </TouchableOpacity>
      </View>

      <View
        ref={scrollViewWrapperRef}
        style={styles.canvasWrapper}
        onLayout={() => {
          scrollViewWrapperRef.current?.measureInWindow((wx, wy, width, height) => {
            setScrollViewLayout({ x: wx, y: wy, width, height });
          });
        }}
      >
      <ScrollView
        style={styles.canvasScroll}
        contentContainerStyle={[styles.canvasContent, { width: CANVAS_SIZE * canvasScale, height: CANVAS_SIZE * canvasScale }]}
        showsVerticalScrollIndicator
        showsHorizontalScrollIndicator
        scrollEnabled={!draggingNodeId && !pendingPlaceNode}
        onScroll={(e) => setContentOffset({ x: e.nativeEvent.contentOffset.x, y: e.nativeEvent.contentOffset.y })}
        scrollEventThrottle={16}
      >
        <View style={{ width: CANVAS_SIZE * canvasScale, height: CANVAS_SIZE * canvasScale }}>
          <View style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, transform: [{ scale: canvasScale }] }}>
        <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} style={StyleSheet.absoluteFill}>
          {edges.map((edge) => {
            const src = nodeMap.get(edge.source);
            const tgt = nodeMap.get(edge.target);
            if (!src || !tgt) return null;
            const x1 = src.position.x + NODE_WIDTH;
            const y1 = src.position.y + NODE_HEIGHT / 2;
            const x2 = tgt.position.x;
            const y2 = tgt.position.y + NODE_HEIGHT / 2;
            return (
              <Line
                key={edge.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={colors.border}
                strokeWidth={2}
              />
            );
          })}
        </Svg>
        {nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            isConnectingFrom={connectingFrom?.nodeId === node.id}
            runLog={runLog ?? null}
            onSelect={() => {
              setSelectedNodeId(node.id);
              setInspectorVisible(true);
            }}
            onOutputPress={handleOutputPress}
            onInputPress={handleInputPress}
            onDragMove={onDragMove}
            onDragEnd={(pos) => updateNodePosition(node.id, pos)}
            onDragStart={() => setDraggingNodeId(node.id)}
            onDragRelease={() => setDraggingNodeId(null)}
            onDelete={() => {
              Alert.alert(
                'Delete node?',
                'This will remove the node and its connections.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteNodeById(node.id) },
                ]
              );
            }}
          />
        ))}
          </View>
        </View>
      </ScrollView>

      {pendingPlaceNode && (
        <View
          style={StyleSheet.absoluteFill}
          onTouchEnd={handlePlaceOnCanvas}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.placeOverlay} />
        </View>
      )}
      </View>

      {pendingPlaceNode && (
        <View style={styles.placeBar}>
          <Text style={styles.placeBarText}>Tap on canvas to place node</Text>
          <TouchableOpacity onPress={() => setPendingPlaceNode(null)}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={libraryVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => { setLibraryVisible(false); setLibrarySearch(''); }}>
          <Pressable style={styles.libraryCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.libraryTitle}>Add node</Text>
            <View style={styles.librarySearchWrap}>
              <Search size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.librarySearchInput}
                value={librarySearch}
                onChangeText={setLibrarySearch}
                placeholder="Search nodes..."
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <FlatList
              data={categoryOrder}
              keyExtractor={(c) => c}
              renderItem={({ item: cat }) => {
                const searchLower = librarySearch.trim().toLowerCase();
                const list = nodeDefinitions.filter(
                  (d) =>
                    d.category === cat &&
                    (!searchLower || d.title.toLowerCase().includes(searchLower) || d.type.toLowerCase().includes(searchLower))
                );
                if (list.length === 0) return null;
                return (
                  <View style={styles.categoryBlock}>
                    <Text style={styles.categoryLabel}>{categoryLabels[cat] ?? cat}</Text>
                    {list.map((def) => (
                      <TouchableOpacity
                        key={def.type}
                        style={styles.libraryItem}
                        onPress={() => addNode(def)}
                      >
                        <Text style={styles.libraryItemText}>{def.title}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              }}
              style={styles.libraryList}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => { setLibraryVisible(false); setLibrarySearch(''); }}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={inspectorVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => { setInspectorVisible(false); setConnectingFrom(null); }}>
          <Pressable style={styles.inspectorCard} onPress={(e) => e.stopPropagation()}>
            <BuilderInspector
              selectedNode={selectedNode ?? null}
              nodes={nodes}
              edges={edges}
              runLog={runLog ?? null}
              runLogLoading={runLogLoading}
              activeTab={inspectorTab}
              onTabChange={setInspectorTab}
              onClose={() => { setInspectorVisible(false); setConnectingFrom(null); }}
              onRemoveNode={removeNode}
              onDuplicateNode={duplicateNode}
              onToggleDisabled={toggleNodeDisabled}
              onRemoveEdge={removeEdge}
              onReRun={runWorkflow}
              onOpenReviewQueue={() => {
                setInspectorVisible(false);
                (nav as any).navigate('MainTabs', { screen: 'ReviewQueue', params: { runId: runLog?.id ?? undefined } });
              }}
              onOpenEdlEditor={(projectId) => {
                setInspectorVisible(false);
                nav.navigate('EdlEditor', { projectId });
              }}
              onConfigChange={updateNodeConfig}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => { setInspectorVisible(false); setConnectingFrom(null); }}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={metaDialogVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setMetaDialogVisible(false)}>
          <Pressable style={styles.metaCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.metaTitle}>Workflow settings</Text>
            <Text style={styles.metaLabel}>Name</Text>
            <TextInput
              style={styles.metaInput}
              value={workflowName}
              onChangeText={setWorkflowName}
              placeholder="Workflow name"
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={styles.metaLabel}>Description</Text>
            <TextInput
              style={[styles.metaInput, styles.metaInputArea]}
              value={workflowDescription}
              onChangeText={setWorkflowDescription}
              placeholder="Description"
              placeholderTextColor={colors.textSecondary}
              multiline
            />
            <Text style={styles.metaLabel}>Status</Text>
            <View style={styles.metaStatusRow}>
              {(['draft', 'active', 'archived'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.metaStatusBtn, workflowStatus === s && styles.metaStatusBtnActive]}
                  onPress={() => setWorkflowStatus(s)}
                >
                  <Text style={[styles.metaStatusText, workflowStatus === s && styles.metaStatusTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.metaFooter}>
              <TouchableOpacity style={styles.metaCancel} onPress={() => setMetaDialogVisible(false)}>
                <Text style={styles.metaCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.metaSave} onPress={() => saveMeta(workflowName, workflowDescription, workflowStatus)}>
                <Text style={styles.metaSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {connectingFrom && (
        <View style={styles.connectingBar}>
          <Text style={styles.connectingText}>Tap an input handle on another node to connect</Text>
          <TouchableOpacity onPress={() => setConnectingFrom(null)}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

interface NodeCardProps {
  node: CanvasNode;
  isSelected: boolean;
  isConnectingFrom: boolean;
  runLog: { logs?: { nodeId: string; status: string }[] } | null;
  onSelect: () => void;
  onOutputPress: (nodeId: string, handleId: string) => void;
  onInputPress: (nodeId: string, handleId: string) => void;
  onDragMove: (nodeId: string, position: { x: number; y: number }) => void;
  onDragEnd: (position: { x: number; y: number }) => void;
  onDragStart: () => void;
  onDragRelease: () => void;
  onDelete: () => void;
}

function NodeCard({
  node,
  isSelected,
  isConnectingFrom,
  runLog,
  onSelect,
  onOutputPress,
  onInputPress,
  onDragMove,
  onDragEnd,
  onDragStart,
  onDragRelease,
  onDelete,
}: NodeCardProps) {
  const startRef = useRef<{ pageX: number; pageY: number; posX: number; posY: number } | null>(null);
  const inputs = node.data?.definition?.inputs ?? ['input'];
  const outputs = node.data?.definition?.outputs ?? ['output'];
  const category = node.data?.definition?.category;
  const config = node.data?.config ?? {};
  const step = runLog?.logs?.find((l) => l.nodeId === node.id);
  const rawStatus = step?.status ?? node.data?.status ?? 'idle';
  const status = typeof rawStatus === 'string' ? rawStatus.toLowerCase() : 'idle';
  const configSummaryLines = getFieldsForType(node.type)
    .slice(0, 2)
    .map((f) => {
      const v = config[f.name];
      if (v === undefined || v === null || v === '') return null;
      return String(v).slice(0, 24);
    })
    .filter(Boolean) as string[];

  const computePos = (pageX: number, pageY: number) => {
    if (!startRef.current) return node.position;
    const x = Math.max(0, startRef.current.posX + (pageX - startRef.current.pageX));
    const y = Math.max(0, startRef.current.posY + (pageY - startRef.current.pageY));
    return { x, y };
  };

  return (
    <View
      style={[
        styles.nodeCard,
        {
          left: node.position.x,
          top: node.position.y,
          width: NODE_WIDTH,
          minHeight: NODE_HEIGHT,
          borderColor: isSelected ? colors.primary : isConnectingFrom ? colors.primary : colors.border,
          borderLeftWidth: 3,
          borderLeftColor: getCategoryAccent(category),
        },
      ]}
    >
      <View style={styles.nodeHandlesRow}>
        <View style={styles.inputHandles}>
          {inputs.map((h) => (
            <TouchableOpacity
              key={h}
              style={styles.handle}
              onPress={() => onInputPress(node.id, h)}
              hitSlop={8}
            >
              <View style={styles.handleDot} />
            </TouchableOpacity>
          ))}
        </View>
        <View
          style={styles.nodeBody}
          onStartShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            startRef.current = {
              pageX: e.nativeEvent.pageX,
              pageY: e.nativeEvent.pageY,
              posX: node.position.x,
              posY: node.position.y,
            };
            onDragStart();
          }}
          onResponderMove={(e) => {
            if (!startRef.current) return;
            const pos = computePos(e.nativeEvent.pageX, e.nativeEvent.pageY);
            onDragMove(node.id, pos);
          }}
          onResponderRelease={(e) => {
            if (startRef.current) {
              const pos = computePos(e.nativeEvent.pageX, e.nativeEvent.pageY);
              onDragEnd(pos);
            }
            startRef.current = null;
            onDragRelease();
          }}
        >
          <TouchableOpacity
            style={styles.nodeCardInner}
            onPress={onSelect}
            onLongPress={onDelete}
            delayLongPress={400}
            activeOpacity={1}
          >
            {status !== 'idle' && status !== 'disabled' && (
              <View style={[styles.statusDot, status === 'success' && styles.statusDotSuccess, status === 'error' && styles.statusDotError]} />
            )}
            <Text style={styles.nodeTitle} numberOfLines={2}>{getNodeTitle(node)}</Text>
            {configSummaryLines.length > 0 && (
              <Text style={styles.nodeConfigSummary} numberOfLines={2}>{configSummaryLines.join(' · ')}</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.outputHandles}>
          {outputs.map((h) => (
            <TouchableOpacity
              key={h}
              style={styles.handle}
              onPress={() => onOutputPress(node.id, h)}
              hitSlop={8}
            >
              <View style={[styles.handleDot, isConnectingFrom && styles.handleDotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 12 },
  error: { fontSize: 17, fontWeight: '600', color: colors.error },
  backBtnStandalone: { marginTop: 16, padding: 12 },
  backBtnText: { fontSize: 16, color: colors.primary, fontWeight: '500' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 56,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  backBtn: { padding: 4 },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  title: { fontSize: 17, fontWeight: '600', color: colors.text, flex: 1 },
  badge: { backgroundColor: colors.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 11, color: colors.text, textTransform: 'capitalize' },
  saveStatus: { fontSize: 12, color: colors.textSecondary, width: 16, textAlign: 'center' },
  iconBtn: { padding: 6 },
  runBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  runBtnText: { fontSize: 14, color: '#fff', fontWeight: '600' },
  addBtn: { padding: 4 },
  canvasScroll: { flex: 1 },
  canvasContent: { position: 'relative' },
  nodeCard: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  nodeHandlesRow: { flexDirection: 'row', alignItems: 'center' },
  inputHandles: { marginRight: 4, gap: 4 },
  outputHandles: { marginLeft: 4, gap: 4 },
  handle: { width: HANDLE_SIZE, height: HANDLE_SIZE, justifyContent: 'center', alignItems: 'center' },
  handleDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  handleDotActive: { backgroundColor: colors.primary },
  nodeBody: { flex: 1, minWidth: 80 },
  nodeCardInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textSecondary },
  statusDotSuccess: { backgroundColor: colors.primary },
  statusDotError: { backgroundColor: colors.error },
  nodeTitle: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 },
  nodeConfigSummary: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  libraryCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  libraryTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 16 },
  librarySearchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  librarySearchInput: { flex: 1, paddingVertical: 10, fontSize: 16, color: colors.text },
  libraryList: { maxHeight: 400 },
  categoryBlock: { marginBottom: 16 },
  categoryLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
  libraryItem: { paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.background, borderRadius: 8, marginBottom: 6 },
  libraryItemText: { fontSize: 15, color: colors.text },
  inspectorCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
    height: '85%',
    maxHeight: '85%',
  },
  modalClose: { paddingVertical: 14, alignItems: 'center' },
  modalCloseText: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  metaCard: { backgroundColor: colors.surface, margin: 24, borderRadius: 16, padding: 20 },
  metaTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 16 },
  metaLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
  metaInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, color: colors.text, marginBottom: 12 },
  metaInputArea: { minHeight: 60 },
  metaStatusRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  metaStatusBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.background },
  metaStatusBtnActive: { backgroundColor: colors.primary },
  metaStatusText: { fontSize: 14, color: colors.text },
  metaStatusTextActive: { color: '#fff' },
  metaFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  metaCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  metaCancelText: { fontSize: 16, color: colors.textSecondary },
  metaSave: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  metaSaveText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  connectingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.primary + '20', borderTopWidth: 1, borderTopColor: colors.border },
  connectingText: { fontSize: 14, color: colors.text },
  canvasWrapper: { flex: 1, position: 'relative' },
  placeOverlay: { flex: 1, backgroundColor: 'transparent' },
  placeBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.primary + '20', borderTopWidth: 1, borderTopColor: colors.border },
  placeBarText: { fontSize: 14, color: colors.text },
});
