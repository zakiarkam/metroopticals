import { FACE_LANDMARK_COUNT } from "./measure";

/**
 * MediaPipe publishes the face mesh as a list of edges, not triangles. A
 * planar triangulation's triangles are exactly its three-cliques, so they
 * are recovered here once and cached  no 2,600-integer table to maintain.
 */

type Connection = { start: number; end: number };

let cached: { source: Connection[]; triangles: number[] } | null = null;

export function trianglesFromConnections(connections: Connection[]): number[] {
  if (cached?.source === connections) return cached.triangles;

  const adjacency: Set<number>[] = Array.from(
    { length: FACE_LANDMARK_COUNT },
    () => new Set<number>(),
  );
  for (const { start, end } of connections) {
    if (start >= FACE_LANDMARK_COUNT || end >= FACE_LANDMARK_COUNT) continue;
    adjacency[start].add(end);
    adjacency[end].add(start);
  }

  const triangles: number[] = [];
  for (let a = 0; a < FACE_LANDMARK_COUNT; a += 1) {
    for (const b of adjacency[a]) {
      if (b <= a) continue;
      for (const c of adjacency[b]) {
        if (c <= b || !adjacency[a].has(c)) continue;
        triangles.push(a, b, c);
      }
    }
  }

  cached = { source: connections, triangles };
  return triangles;
}
