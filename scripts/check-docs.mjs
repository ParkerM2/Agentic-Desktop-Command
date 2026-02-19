import { execSync } from 'node:child_process';

/**
 * Documentation gate — ensures source changes are accompanied by doc updates.
 *
 * Exits 0 (pass) when:
 *   - No src/ files were changed, OR
 *   - At least one ai-docs/ or CLAUDE.md file was also changed
 *
 * Exits 1 (fail) when:
 *   - src/ files changed but zero doc files changed
 *
 * "Changed" = committed on branch (vs merge-base) + staged + unstaged.
 */

const DOC_MAPPING = [
  {
    pattern: /^src\/shared\/types\//,
    docs: ['ARCHITECTURE.md', 'DATA-FLOW.md', 'FEATURES-INDEX.md'],
    agents: ['schema-designer'],
  },
  {
    pattern: /^src\/shared\/ipc\//,
    docs: ['ARCHITECTURE.md', 'DATA-FLOW.md'],
    agents: ['schema-designer'],
  },
  {
    pattern: /ipc-contract\.ts$/,
    docs: ['ARCHITECTURE.md', 'DATA-FLOW.md', 'FEATURES-INDEX.md'],
    agents: ['schema-designer'],
  },
  {
    pattern: /^src\/main\/services\//,
    docs: ['ARCHITECTURE.md', 'FEATURES-INDEX.md'],
    agents: ['service-engineer'],
  },
  {
    pattern: /^src\/main\/ipc\/handlers\//,
    docs: ['DATA-FLOW.md', 'FEATURES-INDEX.md'],
    agents: ['ipc-handler-engineer'],
  },
  {
    pattern: /^src\/renderer\/features\/.*\/components\//,
    docs: ['FEATURES-INDEX.md', 'PATTERNS.md'],
    agents: ['component-engineer'],
  },
  {
    pattern: /^src\/renderer\/features\/.*\/api\//,
    docs: ['FEATURES-INDEX.md'],
    agents: ['hook-engineer'],
  },
  {
    pattern: /^src\/renderer\/features\/.*\/store\.ts$/,
    docs: ['FEATURES-INDEX.md'],
    agents: ['store-engineer'],
  },
  {
    pattern: /^src\/renderer\/features\/.*\/hooks\//,
    docs: ['FEATURES-INDEX.md'],
    agents: ['hook-engineer'],
  },
  {
    pattern: /^src\/renderer\/features\//,
    docs: ['FEATURES-INDEX.md', 'PATTERNS.md'],
  },
  {
    pattern: /^src\/renderer\/shared\/stores\//,
    docs: ['FEATURES-INDEX.md', 'DATA-FLOW.md'],
    agents: ['store-engineer'],
  },
  {
    pattern: /^src\/renderer\/shared\/components\//,
    docs: ['FEATURES-INDEX.md'],
    agents: ['component-engineer'],
  },
  {
    pattern: /^src\/renderer\/shared\/hooks\//,
    docs: ['FEATURES-INDEX.md'],
    agents: ['hook-engineer'],
  },
  {
    pattern: /^src\/renderer\/app\/routes\//,
    docs: ['user-interface-flow.md'],
    agents: ['router-engineer'],
  },
  {
    pattern: /^src\/renderer\/app\/layouts\//,
    docs: ['user-interface-flow.md'],
    agents: ['router-engineer', 'component-engineer'],
  },
  {
    pattern: /^src\/renderer\/styles\//,
    docs: ['PATTERNS.md'],
    agents: ['styling-engineer'],
  },
  {
    pattern: /^src\/main\/services\/agent-orchestrator\//,
    docs: ['ARCHITECTURE.md'],
    agents: ['service-engineer', 'mcp-engineer'],
  },
  {
    pattern: /^src\/main\/services\/assistant\//,
    docs: ['ARCHITECTURE.md'],
    agents: ['assistant-engineer'],
  },
  {
    pattern: /^src\/main\/auth\//,
    docs: ['ARCHITECTURE.md'],
    agents: ['oauth-engineer'],
  },
  {
    pattern: /^src\/main\/services\/git\//,
    docs: ['FEATURES-INDEX.md'],
    agents: ['git-engineer'],
  },
  {
    pattern: /^src\/main\/services\/terminal\//,
    docs: ['FEATURES-INDEX.md'],
    agents: ['service-engineer'],
  },
  {
    pattern: /^src\/main\/tray\//,
    docs: ['FEATURES-INDEX.md'],
    agents: ['tray-engineer'],
  },
  {
    pattern: /^src\/main\/services\/notifications\//,
    docs: ['FEATURES-INDEX.md'],
    agents: ['notification-engineer'],
  },
  {
    pattern: /^tests\//,
    docs: ['FEATURES-INDEX.md'],
    agents: ['test-engineer'],
  },
];

function git(command) {
  try {
    return execSync(`git ${command}`, { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

function getMergeBase() {
  // Try master first, then main
  for (const branch of ['master', 'main']) {
    const base = git(`merge-base HEAD ${branch}`);
    if (base.length > 0) {
      return base;
    }
  }
  return '';
}

function getChangedFiles() {
  const mergeBase = getMergeBase();
  const files = new Set();

  // Committed changes on branch (vs merge-base)
  if (mergeBase.length > 0) {
    const committed = git(`diff --name-only ${mergeBase}...HEAD`);
    for (const f of committed.split('\n').filter(Boolean)) {
      files.add(f);
    }
  }

  // Staged changes
  const staged = git('diff --cached --name-only');
  for (const f of staged.split('\n').filter(Boolean)) {
    files.add(f);
  }

  // Unstaged changes
  const unstaged = git('diff --name-only');
  for (const f of unstaged.split('\n').filter(Boolean)) {
    files.add(f);
  }

  return [...files];
}

function isSrcFile(file) {
  return file.startsWith('src/');
}

function isDocFile(file) {
  return (
    file.startsWith('ai-docs/') ||
    file.startsWith('docs/plans/') ||
    file.startsWith('docs/progress/') ||
    file.startsWith('.claude/agents/') ||
    file === 'docs/tracker.json' ||
    file === 'CLAUDE.md'
  );
}

// --- Main ---

const changedFiles = getChangedFiles();

if (changedFiles.length === 0) {
  console.log('check:docs — No changed files detected. PASS');
  process.exit(0);
}

const srcFiles = changedFiles.filter(isSrcFile);
const docFiles = changedFiles.filter(isDocFile);

if (srcFiles.length === 0) {
  console.log('check:docs — No src/ changes detected. PASS');
  process.exit(0);
}

if (docFiles.length > 0) {
  console.log(`check:docs — ${srcFiles.length} source file(s) changed, ${docFiles.length} doc file(s) updated. PASS`);
  console.log('  Doc files updated:');
  for (const f of docFiles) {
    console.log(`    - ${f}`);
  }
  process.exit(0);
}

// FAIL — src/ changed but no docs changed
console.error('');
console.error('============================================================');
console.error('  check:docs FAILED — source changes without doc updates');
console.error('============================================================');
console.error('');
console.error(`  ${srcFiles.length} source file(s) changed but 0 doc files updated.`);
console.error('  Every code change must include corresponding ai-docs/ updates.');
console.error('');

// Suggest which docs to update based on changed source paths
const recommended = new Set();

for (const file of srcFiles) {
  for (const mapping of DOC_MAPPING) {
    if (mapping.pattern.test(file)) {
      for (const doc of mapping.docs) {
        recommended.add(doc);
      }
    }
  }
}

if (recommended.size > 0) {
  console.error('  Recommended docs to update based on changed paths:');
  for (const doc of recommended) {
    console.error(`    - ai-docs/${doc}`);
  }
} else {
  console.error('  Recommended docs to update:');
  console.error('    - ai-docs/FEATURES-INDEX.md (new files/features)');
  console.error('    - ai-docs/ARCHITECTURE.md (services, IPC, structure)');
  console.error('    - ai-docs/PATTERNS.md (new patterns/conventions)');
  console.error('    - ai-docs/DATA-FLOW.md (new data flows/events)');
}

const recommendedAgents = new Set();

for (const file of srcFiles) {
  for (const mapping of DOC_MAPPING) {
    if (mapping.pattern.test(file) && mapping.agents) {
      for (const agent of mapping.agents) {
        recommendedAgents.add(agent);
      }
    }
  }
}

if (recommendedAgents.size > 0) {
  console.error('');
  console.error('  Recommended agent definitions to review:');
  for (const agent of recommendedAgents) {
    console.error(`    - .claude/agents/${agent}.md`);
  }
}

console.error('');
console.error('  Changed source files:');
for (const f of srcFiles) {
  console.error(`    - ${f}`);
}
console.error('');

process.exit(1);
