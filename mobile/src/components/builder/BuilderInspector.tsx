import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Trash2,
  Copy,
  EyeOff,
  Eye,
  Settings2,
  Terminal,
  ListChecks,
  GitBranch,
  Play,
  RotateCcw,
  X,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import type { ExecutionDetail } from '../../lib/api/endpoints';
import { NodeConfigForm } from './NodeConfigForm';

export type InspectorTab = 'config' | 'logs' | 'queue' | 'connections';

export interface CanvasNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data?: {
    definition?: { type?: string; category?: string; title?: string; inputs?: string[]; outputs?: string[] };
    config?: Record<string, unknown>;
    status?: string;
  };
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

function getNodeTitle(node: CanvasNode): string {
  return node.data?.definition?.title ?? node.type ?? node.id;
}

interface BuilderInspectorProps {
  selectedNode: CanvasNode | null;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  runLog: ExecutionDetail | null;
  runLogLoading: boolean;
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  onClose: () => void;
  onRemoveNode: () => void;
  onDuplicateNode: () => void;
  onToggleDisabled: () => void;
  onRemoveEdge: (edgeId: string) => void;
  onReRun: () => void;
  onOpenEdlEditor?: (projectId: string) => void;
  onOpenReviewQueue?: () => void;
  onConfigChange?: (nodeId: string, config: Record<string, unknown>) => void;
}

export function BuilderInspector({
  selectedNode,
  nodes,
  edges,
  runLog,
  runLogLoading,
  activeTab,
  onTabChange,
  onClose,
  onRemoveNode,
  onDuplicateNode,
  onToggleDisabled,
  onRemoveEdge,
  onReRun,
  onOpenEdlEditor,
  onOpenReviewQueue,
  onConfigChange,
}: BuilderInspectorProps) {
  const isReviewNode = selectedNode?.data?.definition?.type === 'review.approval_gate';
  const nodeEdges = selectedNode
    ? {
        incoming: edges.filter((e) => e.target === selectedNode.id),
        outgoing: edges.filter((e) => e.source === selectedNode.id),
      }
    : { incoming: [], outgoing: [] };
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const getNodeTitleById = (id: string) => getNodeTitle(nodeMap.get(id) ?? { id, type: '', position: { x: 0, y: 0 } });

  const tabs: { id: InspectorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'config', label: 'Config', icon: <Settings2 size={16} color={colors.text} /> },
    { id: 'logs', label: 'Logs', icon: <Terminal size={16} color={colors.text} /> },
    ...(isReviewNode ? [{ id: 'queue' as const, label: 'Queue', icon: <ListChecks size={16} color={colors.text} /> }] : []),
    { id: 'connections', label: 'Connections', icon: <GitBranch size={16} color={colors.text} /> },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, activeTab === t.id && styles.tabActive]}
              onPress={() => onTabChange(t.id)}
            >
              {t.icon}
              <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {activeTab === 'config' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {selectedNode ? getNodeTitle(selectedNode) : 'Node'}
            </Text>
            {selectedNode ? (
              <>
                {onConfigChange && (
                  <NodeConfigForm
                    node={selectedNode}
                    onConfigChange={onConfigChange}
                  />
                )}
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={onDuplicateNode}>
                    <Copy size={18} color={colors.primary} />
                    <Text style={styles.actionBtnText}>Duplicate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={onToggleDisabled}>
                    {selectedNode.data?.status === 'disabled' ? (
                      <Eye size={18} color={colors.primary} />
                    ) : (
                      <EyeOff size={18} color={colors.primary} />
                    )}
                    <Text style={styles.actionBtnText}>
                      {selectedNode.data?.status === 'disabled' ? 'Enable' : 'Disable'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={onRemoveNode}>
                  <Trash2 size={20} color={colors.error} />
                  <Text style={styles.deleteBtnText}>Delete node</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.hint}>Select a node to configure.</Text>
            )}
          </View>
        )}

        {activeTab === 'logs' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Run logs</Text>
            {runLogLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
            ) : !runLog ? (
              <>
                <Text style={styles.hint}>No run yet. Use Run in the header to execute the workflow.</Text>
                <TouchableOpacity style={styles.runBtn} onPress={onReRun}>
                  <Play size={18} color="#fff" />
                  <Text style={styles.runBtnText}>Run workflow</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.logStatusRow}>
                  <Text style={styles.logStatus}>{runLog.status}</Text>
                  {runLog.status !== 'RUNNING' && (
                    <TouchableOpacity style={styles.rerunBtn} onPress={onReRun}>
                      <RotateCcw size={14} color={colors.primary} />
                      <Text style={styles.rerunBtnText}>Re-run</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {(runLog.logs ?? []).map((step) => (
                  <View key={step.nodeId} style={styles.stepRow}>
                    <View style={[styles.stepDot, step.status === 'success' && styles.stepDotSuccess, step.status === 'error' && styles.stepDotError]} />
                    <Text style={styles.stepTitle} numberOfLines={1}>{step.nodeTitle || step.nodeId}</Text>
                    <Text style={styles.stepStatus}>{step.status}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {activeTab === 'queue' && isReviewNode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Review queue</Text>
            <Text style={styles.hint}>Open the Review Queue tab or this run from Runs to approve/skip items.</Text>
            {(() => {
              const reviewStep = runLog?.logs?.find((s) => s.nodeId === selectedNode?.id);
              const output = reviewStep?.output as Record<string, unknown> | undefined;
              const projectId = output && typeof output.projectId === 'string' ? output.projectId : null;
              return (
                <>
                  {projectId && onOpenEdlEditor && (
                    <TouchableOpacity
                      style={[styles.runBtn, { marginBottom: 12 }]}
                      onPress={() => onOpenEdlEditor(projectId)}
                    >
                      <ListChecks size={18} color="#fff" />
                      <Text style={styles.runBtnText}>Edit draft</Text>
                    </TouchableOpacity>
                  )}
                  {onOpenReviewQueue && (
                    <TouchableOpacity style={styles.runBtn} onPress={onOpenReviewQueue}>
                      <ListChecks size={18} color="#fff" />
                      <Text style={styles.runBtnText}>Open Review Queue</Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
          </View>
        )}

        {activeTab === 'connections' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connections</Text>
            {selectedNode ? (
              <>
                {nodeEdges.incoming.length === 0 && nodeEdges.outgoing.length === 0 ? (
                  <Text style={styles.hint}>No connections. Use output handles on one node and input handles on another to connect.</Text>
                ) : (
                  <>
                    {nodeEdges.incoming.length > 0 && (
                      <>
                        <Text style={styles.connLabel}>Incoming</Text>
                        {nodeEdges.incoming.map((e) => (
                          <View key={e.id} style={styles.connRow}>
                            <Text style={styles.connText}>{getNodeTitleById(e.source)} → this</Text>
                            <TouchableOpacity onPress={() => onRemoveEdge(e.id)} style={styles.connDelete}>
                              <Trash2 size={16} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </>
                    )}
                    {nodeEdges.outgoing.length > 0 && (
                      <>
                        <Text style={styles.connLabel}>Outgoing</Text>
                        {nodeEdges.outgoing.map((e) => (
                          <View key={e.id} style={styles.connRow}>
                            <Text style={styles.connText}>this → {getNodeTitleById(e.target)}</Text>
                            <TouchableOpacity onPress={() => onRemoveEdge(e.id)} style={styles.connDelete}>
                              <Trash2 size={16} color={colors.error} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <Text style={styles.hint}>Select a node to see its connections.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 200 },
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8 },
  tabsScroll: { flex: 1 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 4 },
  tabActive: { backgroundColor: colors.border, borderRadius: 8 },
  tabText: { fontSize: 14, color: colors.textSecondary },
  tabTextActive: { color: colors.text, fontWeight: '600' },
  closeBtn: { padding: 8 },
  content: { flex: 1 },
  contentInner: { padding: 16, paddingBottom: 32 },
  section: {},
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 },
  hint: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
  loader: { marginVertical: 16 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtnText: { fontSize: 15, color: colors.primary, fontWeight: '500' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.background, borderRadius: 10 },
  deleteBtnText: { fontSize: 15, color: colors.error, fontWeight: '600' },
  runBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignSelf: 'flex-start' },
  runBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  logStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  logStatus: { fontSize: 14, fontWeight: '600', color: colors.text, textTransform: 'capitalize' },
  rerunBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rerunBtnText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textSecondary },
  stepDotSuccess: { backgroundColor: colors.primary },
  stepDotError: { backgroundColor: colors.error },
  stepTitle: { flex: 1, fontSize: 14, color: colors.text },
  stepStatus: { fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  connLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 12, marginBottom: 4 },
  connRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.background, borderRadius: 8, marginBottom: 6 },
  connText: { fontSize: 14, color: colors.text, flex: 1 },
  connDelete: { padding: 4 },
});
