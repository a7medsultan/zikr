export default {
	meta: {
		name: 'English',
		nativeName: 'English',
		dir: 'ltr',
		/** BCP-47 tag used for dates and plural rules. */
		tag: 'en-GB'
	},

	app: {
		title: 'Zikr',
		tagline: 'Digital Tasbeeh',
		description: 'A calm, offline-first digital tasbeeh counter for your daily dhikr.'
	},

	nav: {
		stats: 'Statistics',
		settings: 'Settings',
		mute: 'Mute sound',
		unmute: 'Unmute sound',
		enterFocus: 'Enter focus mode',
		exitFocus: 'Exit focus mode',
		focusShort: 'Zen',
		close: 'Close',
		manage: 'Manage'
	},

	common: {
		done: 'Done',
		cancel: 'Cancel',
		save: 'Save',
		delete: 'Delete',
		edit: 'Edit',
		undo: 'Undo',
		reset: 'Reset',
		saveChanges: 'Save changes',
		optional: 'optional'
	},

	counter: {
		tap: 'Tap the circle to count',
		hint: 'Tap the circle to count · Esc to exit focus',
		tapLabel: 'Counter. Activate to add one.',
		loading: 'Loading…',
		resetCounter: 'Reset counter',
		today: 'Today {count}',
		streakShort: '{count}d streak',
		goalShort: '{count}% of goal',
		totalShort: '{count} total',
		of: 'of {target}',
		complete: 'complete',
		full: '{count} of {target}'
	},

	auto: {
		start: 'Auto count',
		pause: 'Pause · {seconds}s',
		resume: 'Resume',
		unit: 's',
		every: 'Every {seconds}s',
		oneEvery: 'One count every {seconds} seconds',
		running: '{count} counted automatically · tap the circle to add by hand',
		stoppedOnHide: 'Auto count paused while the app was in the background'
	},

	celebration: {
		targetReached: 'target of {target} reached',
		completed: 'Target complete'
	},

	zikr: {
		heading: 'Dhikr',
		add: '+ Add custom dhikr',
		edit: 'Count this',
		target: 'target {target}',
		noTarget: 'no target',
		stats: '{session} this session · {total} all time',
		moveUp: 'Move {name} up',
		moveDown: 'Move {name} down',
		confirmDelete: 'Confirm delete',
		save: 'Save dhikr',
		form: {
			translit: 'Transliteration',
			arabic: 'Arabic',
			meaning: 'Meaning',
			target: 'Target',
			translitPlaceholder: 'e.g. Yā Ḥayy',
			arabicPlaceholder: 'يَا حَيُّ',
			meaningPlaceholder: 'O Ever-Living',
			infiniteHelp: 'Counts freely with no target.',
			targetHelp: 'The counter celebrates each time it reaches this number.'
		}
	},

	stats: {
		heading: 'Statistics',
		today: 'Today',
		goalLabel: 'goal {goal}',
		dayStreak: 'day streak',
		bestStreak: 'best streak',
		activeDays: 'active days',
		dailyGoal: 'daily goal',
		lifetime: 'Lifetime',
		totalCounted: 'total dhikr counted',
		trend: 'Trend',
		rangeDays: '{range}d',
		periodLabel: 'last {range} days',
		average: '{count}/day avg',
		bestDay: 'Best day: {count} on {date}',
		activity: 'Activity',
		backup: 'Backup & export',
		exportJson: 'Export JSON',
		exportHistory: 'Export history CSV',
		exportDaily: 'Export daily CSV',
		importJson: 'Import JSON',
		clearHistory: 'Clear history…',
		erased: 'History cleared.',
		less: 'Less',
		more: 'More',
		imported: 'Imported {count} entries.',
		failed: 'Something went wrong.',
		tooltip: {
			one: '{date} — {count} dhikr',
			other: '{date} — {count} dhikr'
		}
	},

	settings: {
		heading: 'Settings',
		appearance: 'Appearance',
		theme: {
			label: 'Theme',
			dark: 'Dark',
			light: 'Light',
			system: 'System'
		},
		backdrop: 'Backdrop',
		gradients: {
			label: 'Backdrop',
			emerald: 'Emerald',
			midnight: 'Midnight',
			sand: 'Sand',
			dusk: 'Dusk'
		},
		pattern: {
			label: 'Pattern',
			none: 'None',
			girih: 'Girih',
			stars: 'Stars',
			waves: 'Waves'
		},
		beads: 'Beads per strand',
		showArabic: 'Show Arabic',
		showTranslation: 'Show translation',
		sound: 'Sound & feel',
		mute: 'Mute',
		unmute: 'Unmuted',
		sounds: {
			label: 'Sound',
			wood: 'Wood',
			mech: 'Mechanical',
			soft: 'Soft',
			none: 'Silent'
		},
		volume: 'Volume',
		haptics: 'Haptic feedback',
		goals: 'Goals',
		dailyGoal: 'Daily goal',
		autoInterval: 'Auto-count interval',
		zenOnLaunch: 'Start in focus mode',
		app: 'App',
		install: 'Install Zikr',
		installed: 'Installed — running offline-capable.',
		installHint: 'Use your browser’s “Add to home screen” to install Zikr.',
		update: 'Update available — reload',
		reset: 'Reset app data…',
		resetWarn: 'Reset this device’s Zikr data? Export a backup first.',
		erase: 'Erase everything'
	},

	a11y: {
		announcer: 'Count',
		backdropClose: 'Close',
		countAnnounce: '{name}: {count}',
		targetAnnounce: '{name}: {count}. Target of {target} complete.',
		volumePercent: '{count} percent'
	},

	about: {
		heading: 'About Zikr',
		description:
			'Zikr is a calm, offline-first tasbeeh counter. It keeps a quiet record of your dhikr without accounts, servers or tracking — everything you count stays on your own device.',
		featuresTitle: 'What it does',
		features: [
			'Count on an 11, 33 or 99 bead strand — tap the circle',
			'Focus mode for distraction-free counting',
			'Hands-free auto-counting from one to five seconds',
			'Seven classic dhikr plus your own, each with a custom target',
			'A quiet celebration whenever you reach a target',
			'Streaks, daily goals, activity heatmap and trend charts',
			'Export a JSON backup or CSV, and restore it any time',
			'Works fully offline and installs to your home screen',
			'English and Arabic with full right-to-left support'
		],
		share: 'Share Zikr',
		shared: 'Shared',
		copied: 'Link copied to your clipboard',
		website: 'Website',
		contact: 'Contact the developer',
		version: 'Version {version}',
		closing: 'Built for the sake of remembering Allah.'
	},

	export: {
		invalidJson: 'That file is not valid JSON.',
		notBackup: 'That file does not look like a Zikr backup.'
	}
};