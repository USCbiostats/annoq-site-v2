import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Checkbox,
  IconButton,
  InputAdornment,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { useVirtualizer } from '@tanstack/react-virtual';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import type { AnnotationNode, AnnotationStore } from '../../types';

type VisibleNode = {
  node: AnnotationNode;
  depth: number;
};

type Props = {
  store: AnnotationStore;
  selected: string[];
  onSelectedChange: (selected: string[]) => void;
  onInfo?: (node: AnnotationNode) => void;
  showDescriptions?: boolean;
};

export const AnnotationTree = memo(function AnnotationTree({
  store,
  selected,
  onSelectedChange,
  onInfo,
  showDescriptions = false
}: Props) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(store.tree.slice(0, 2).map((node) => node.name)));
  const parentRef = useRef<HTMLDivElement>(null);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const visibleNodes = useMemo(
    () => flattenVisibleNodes(store.tree, expanded, query),
    [expanded, query, store.tree]
  );
  const virtualizer = useVirtualizer({
    count: visibleNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (showDescriptions ? 64 : 36),
    overscan: 12
  });

  const toggleExpanded = useCallback((name: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const toggleNode = useCallback((node: AnnotationNode) => {
    const leaves = store.leafNamesByName[node.name] ?? [node.name];
    const allSelected = leaves.every((name) => selectedSet.has(name));
    const next = new Set(selectedSet);
    leaves.forEach((name) => {
      if (allSelected) next.delete(name);
      else next.add(name);
    });
    onSelectedChange([...next]);
  }, [onSelectedChange, selectedSet, store.leafNamesByName]);

  return (
    <Box className="annotation-tree">
      <TextField
        size="small"
        fullWidth
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search annotations"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }
        }}
        sx={{ mb: 1 }}
      />
      <Box ref={parentRef} className="annotation-virtual-list">
        <Box sx={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = visibleNodes[virtualRow.index];
            const node = item.node;
            const leaves = store.leafNamesByName[node.name] ?? [node.name];
            const checked = leaves.length > 0 && leaves.every((name) => selectedSet.has(name));
            const indeterminate = !checked && leaves.some((name) => selectedSet.has(name));
            const isExpanded = expanded.has(node.name) || Boolean(query);
            const secondary = showDescriptions && node.detail ? node.detail : node.leaf ? node.name : undefined;

            return (
              <Box
                key={node.name}
                className="annotation-virtual-row"
                sx={{
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`
                }}
              >
                <ListItemButton dense sx={{ pl: 1 + item.depth * 2, height: '100%' }} onClick={() => toggleNode(node)}>
                  <Box sx={{ width: 28, flex: '0 0 auto' }}>
                    {node.children.length > 0 && (
                      <IconButton
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleExpanded(node.name);
                        }}
                      >
                        {isExpanded ? <ExpandLessIcon fontSize="inherit" /> : <ExpandMoreIcon fontSize="inherit" />}
                      </IconButton>
                    )}
                  </Box>
                  <Checkbox
                    size="small"
                    checked={checked}
                    indeterminate={indeterminate}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => toggleNode(node)}
                    sx={{ p: 0.5, mr: 0.5 }}
                  />
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline', minWidth: 0 }}>
                        <Typography variant="body2" noWrap>{node.label || node.name}</Typography>
                        {node.leaf && !showDescriptions && <Typography variant="caption" color="text.secondary" noWrap>{node.name}</Typography>}
                      </Stack>
                    }
                    secondary={secondary && (showDescriptions || !node.leaf) ? <Typography variant="caption" color="text.secondary">{secondary}</Typography> : undefined}
                  />
                  {onInfo && (
                    <Tooltip title="Annotation details">
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          onInfo(node);
                        }}
                      >
                        <InfoOutlinedIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  )}
                </ListItemButton>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
});

function flattenVisibleNodes(nodes: AnnotationNode[], expanded: Set<string>, query: string): VisibleNode[] {
  const needle = query.trim().toLowerCase();
  const walk = (node: AnnotationNode, depth: number): VisibleNode[] => {
    const selfMatches = !needle || `${node.name} ${node.label ?? ''} ${node.detail ?? ''}`.toLowerCase().includes(needle);
    const canShowChildren = Boolean(needle) || expanded.has(node.name) || depth === 0;
    const childRows = canShowChildren ? node.children.flatMap((child) => walk(child, depth + 1)) : [];

    if (selfMatches || childRows.length > 0) {
      return [{ node, depth }, ...childRows];
    }
    return [];
  };

  return nodes.flatMap((node) => walk(node, 0));
}
