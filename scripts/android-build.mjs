import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const task = process.argv[2] ?? 'assembleDebug';

const candidates = [
	process.env.JAVA_HOME,
	join(homedir(), '.jdks', 'jbr-21.0.11'),
	'/usr/lib/jvm/java-21-openjdk-amd64',
	'/usr/lib/jvm/java-21-openjdk',
	join(homedir(), 'snap', 'android-studio', 'current', 'jbr'),
	'/opt/android-studio/jbr',
	'/Applications/Android Studio.app/Contents/jbr/Contents/Home',
	'C:\\Program Files\\Android\\Android Studio\\jbr'
];

const javaHome = candidates.find((path) => path && existsSync(join(path, 'bin', 'java')));

if (!javaHome) {
	console.error('No JDK 21 found. Install one or set JAVA_HOME, then retry.');
	process.exit(1);
}

const androidDir = resolve(import.meta.dirname, '..', 'android');
const gradlew = join(androidDir, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');

console.log(`Using JAVA_HOME=${javaHome}`);
const result = spawnSync(gradlew, [task, '--no-daemon'], {
	cwd: androidDir,
	env: { ...process.env, JAVA_HOME: javaHome },
	stdio: 'inherit',
	shell: process.platform === 'win32'
});

process.exit(result.status ?? 1);
