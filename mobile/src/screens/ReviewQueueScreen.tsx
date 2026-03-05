import { StyleSheet, Text, View } from 'react-native';

export function ReviewQueueScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Review Queue</Text>
      <Text style={styles.subtitle}>Placeholder — items awaiting review</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
