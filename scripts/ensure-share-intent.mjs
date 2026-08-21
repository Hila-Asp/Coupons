import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEND_FILTER = `            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="text/*" />
            </intent-filter>`;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRoot = join(scriptDir, '..');
const input = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;

function resolveManifestPath(rootOrFile) {
  if (rootOrFile.endsWith('AndroidManifest.xml')) {
    return rootOrFile;
  }
  return join(rootOrFile, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
}

function findMainActivity(xml) {
  const activityRe = /<activity\b[\s\S]*?<\/activity>/g;
  let match = activityRe.exec(xml);
  while (match) {
    if (/android:name\s*=\s*"[^"]*MainActivity"/.test(match[0])) {
      return { start: match.index, end: match.index + match[0].length, text: match[0] };
    }
    match = activityRe.exec(xml);
  }
  return null;
}

function activityHasSendTextFilter(activityXml) {
  const filterRe = /<intent-filter\b[^>]*>[\s\S]*?<\/intent-filter>/g;
  let match = filterRe.exec(activityXml);
  while (match) {
    const filter = match[0];
    const hasSend = /android:name\s*=\s*"android\.intent\.action\.SEND"/.test(filter);
    const hasText = /android:mimeType\s*=\s*"text\/\*"/.test(filter);
    if (hasSend && hasText) {
      return true;
    }
    match = filterRe.exec(activityXml);
  }
  return false;
}

function ensureLaunchMode(activityXml) {
  const openEnd = activityXml.indexOf('>');
  if (openEnd === -1) {
    throw new Error('Malformed <activity> tag in AndroidManifest.xml');
  }
  const openTag = activityXml.slice(0, openEnd + 1);
  if (/android:launchMode\s*=/.test(openTag)) {
    return activityXml;
  }
  const withMode = openTag.replace(/\s*\/?>$/, '\n            android:launchMode="singleTask">');
  return withMode + activityXml.slice(openEnd + 1);
}

function ensureSendTextFilter(activityXml) {
  if (activityHasSendTextFilter(activityXml)) {
    return activityXml;
  }
  return activityXml.replace(/\s*<\/activity>\s*$/, `\n${SEND_FILTER}\n        </activity>`);
}

function patchAndroidManifest(xml) {
  const found = findMainActivity(xml);
  if (!found) {
    throw new Error('MainActivity not found in AndroidManifest.xml');
  }
  const nextActivity = ensureSendTextFilter(ensureLaunchMode(found.text));
  if (nextActivity === found.text) {
    return { xml, changed: false };
  }
  return {
    xml: xml.slice(0, found.start) + nextActivity + xml.slice(found.end),
    changed: true,
  };
}

async function main() {
  const manifestPath = resolveManifestPath(input);
  if (!existsSync(manifestPath)) {
    throw new Error(`AndroidManifest.xml not found at ${manifestPath}`);
  }

  const original = await readFile(manifestPath, 'utf8');
  const { xml, changed } = patchAndroidManifest(original);
  if (!changed) {
    console.log(`share intent already present: ${manifestPath}`);
    return;
  }
  await writeFile(manifestPath, xml, 'utf8');
  console.log(`updated share intent: ${manifestPath}`);
}

await main();
