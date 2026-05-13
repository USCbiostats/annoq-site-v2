import type { Annotation, AnnotationNode, AnnotationStore } from '../types';

export function buildAnnotationStore(annotations: Annotation[]): AnnotationStore {
  const normalized = annotations.map((annotation) => ({
    ...annotation,
    label: annotation.label || annotation.name
  }));
  const byName = Object.fromEntries(normalized.map((annotation) => [annotation.name, annotation]));
  const byApiField = Object.fromEntries(
    normalized.map((annotation) => [annotation.api_field || annotation.name, annotation])
  );
  const tree = buildAnnotationTree(normalized);
  const leafNamesByName: Record<string, string[]> = {};
  const indexLeafNames = (node: AnnotationNode) => {
    leafNamesByName[node.name] = collectLeafNames(node);
    node.children.forEach(indexLeafNames);
  };
  tree.forEach(indexLeafNames);
  return {
    annotations: normalized,
    tree,
    byName,
    byApiField,
    leafNamesByName,
    rsidField: findRsidField(normalized)
  };
}

export function buildAnnotationTree(annotations: Annotation[]): AnnotationNode[] {
  const nodes = new Map<number, AnnotationNode>();
  annotations.forEach((annotation) => {
    nodes.set(annotation.id, { ...annotation, children: [] });
  });

  const roots: AnnotationNode[] = [];
  nodes.forEach((node) => {
    if (node.parent_id && nodes.has(node.parent_id)) {
      nodes.get(node.parent_id)?.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export function collectDescendantNames(node: AnnotationNode): string[] {
  return [node.name, ...node.children.flatMap(collectDescendantNames)];
}

export function collectLeafNames(node: AnnotationNode): string[] {
  if (node.leaf || node.children.length === 0) {
    return [node.name];
  }
  return node.children.flatMap(collectLeafNames);
}

export function findNodeByName(nodes: AnnotationNode[], name: string): AnnotationNode | undefined {
  for (const node of nodes) {
    if (node.name === name) return node;
    const child = findNodeByName(node.children, name);
    if (child) return child;
  }
  return undefined;
}

export function apiFieldFor(name: string, store: AnnotationStore): string {
  return store.byName[name]?.api_field || name;
}

export function nameForApiField(apiField: string, store: AnnotationStore): string {
  return store.byApiField[apiField]?.name || apiField;
}

export function labelFor(name: string, store: AnnotationStore): string {
  return (store.byName[name]?.label || name).replace(/_/g, ' ');
}

export function baseColumnsForStore(store: AnnotationStore): string[] {
  return ['chr', 'pos', 'ref', 'alt', store.rsidField];
}

function findRsidField(annotations: Annotation[]): string {
  const exactNames = ['rs_dbSNP151', 'rs_dbSNP'];
  for (const name of exactNames) {
    if (annotations.some((annotation) => annotation.name === name || annotation.api_field === name)) {
      return name;
    }
  }

  const candidate = annotations.find((annotation) => {
    const name = annotation.name.toLowerCase();
    const apiField = annotation.api_field?.toLowerCase() ?? '';
    return annotation.leaf && (name === 'rsid' || name.includes('rs_dbsnp') || apiField.includes('rs_dbsnp'));
  });

  return candidate?.name ?? 'rs_dbSNP151';
}
