// A tiny, dependency-free remark plugin for Obsidian-style [[wiki links]].
//
// Supports:
//   [[slug]]              -> <a href="/blog/slug" class="wikilink">slug</a>
//   [[slug|custom text]]  -> <a href="/blog/slug" class="wikilink">custom text</a>
//
// It only rewrites plain-text nodes, so `[[...]]` inside code spans/blocks is left alone.

const WIKILINK = /\[\[([^\]]+?)\]\]/g;

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

function splitText(value) {
  const nodes = [];
  let lastIndex = 0;
  WIKILINK.lastIndex = 0;
  let match;
  while ((match = WIKILINK.exec(value)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', value: value.slice(lastIndex, match.index) });
    }
    const [target, label] = match[1].split('|').map((s) => s.trim());
    nodes.push({
      type: 'link',
      url: `/blog/${slugify(target)}`,
      data: { hProperties: { className: 'wikilink' } },
      children: [{ type: 'text', value: label || target }],
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < value.length) {
    nodes.push({ type: 'text', value: value.slice(lastIndex) });
  }
  return nodes;
}

function transform(node) {
  if (!node.children || node.children.length === 0) return;
  const next = [];
  for (const child of node.children) {
    if (child.type === 'text' && child.value.includes('[[')) {
      next.push(...splitText(child.value));
    } else {
      transform(child);
      next.push(child);
    }
  }
  node.children = next;
}

export default function remarkWikilinks() {
  return (tree) => transform(tree);
}
