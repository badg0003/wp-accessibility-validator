#!/usr/bin/env node
const { execSync } = require('child_process');

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function getPrevTag(ref) {
  try {
    // get previous tag for the provided ref (e.g., refs/tags/v2.0.2)
    return run(`git describe --tags --abbrev=0 ${ref}^`);
  } catch (e) {
    return null;
  }
}

function getCommits(prevTag) {
  const range = prevTag ? `${prevTag}..HEAD` : 'HEAD';
  const raw = run(`git log --pretty=format:%s:::%h ${range}`);
  if (!raw) return [];
  return raw.split('\n').map((line) => {
    const parts = line.split(':::');
    return { message: parts[0], hash: parts[1] };
  });
}

function parseType(message) {
  // Conventional Commits: type(scope)?: description
  const m = message.match(/^([a-zA-Z]+)(?:\([^)]*\))?:\s+(.*)$/);
  if (!m) return null;
  return { type: m[1].toLowerCase(), desc: m[2] };
}

function generateNotes(commits) {
  const groups = {
    feat: [],
    fix: [],
    docs: [],
    perf: [],
    refactor: [],
    test: [],
    ci: [],
    chore: [],
    other: [],
  };

  for (const c of commits) {
    const parsed = parseType(c.message);
    const entry = `- ${parsed ? parsed.desc : c.message} (${c.hash})`;
    if (parsed && groups[parsed.type]) {
      groups[parsed.type].push(entry);
    } else if (parsed) {
      // unknown type -> other
      groups.other.push(entry);
    } else {
      groups.other.push(entry);
    }
  }

  const sections = [];
  if (groups.feat.length) {
    sections.push('### Features', groups.feat.join('\n'));
  }
  if (groups.fix.length) {
    sections.push('### Bug Fixes', groups.fix.join('\n'));
  }
  if (groups.docs.length) {
    sections.push('### Documentation', groups.docs.join('\n'));
  }
  if (groups.perf.length) {
    sections.push('### Performance', groups.perf.join('\n'));
  }
  if (groups.refactor.length) {
    sections.push('### Refactoring', groups.refactor.join('\n'));
  }
  if (groups.test.length) {
    sections.push('### Tests', groups.test.join('\n'));
  }
  if (groups.ci.length) {
    sections.push('### CI', groups.ci.join('\n'));
  }
  if (groups.chore.length) {
    sections.push('### Chore', groups.chore.join('\n'));
  }
  if (groups.other.length) {
    sections.push('### Other changes', groups.other.join('\n'));
  }

  if (sections.length === 0) return 'No changes.';
  return sections.join('\n\n');
}

function main() {
  const ref = process.env.GITHUB_REF || 'HEAD';
  const prev = getPrevTag(ref);
  const commits = getCommits(prev);
  const notes = generateNotes(commits);
  console.log(notes);
}

main();
