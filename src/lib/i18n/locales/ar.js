export default {
	meta: {
		name: 'Arabic',
		nativeName: 'العربية',
		dir: 'rtl',
		tag: 'ar'
	},

	app: {
		title: 'ذِكْر',
		tagline: 'مسبحة رقمية',
		description: 'مسبحة رقمية هادئة تعمل دون اتصال لتحسين أذكارك اليومية.'
	},

	nav: {
		stats: 'الإحصائيات',
		settings: 'الإعدادات',
		language: 'اللغة',
		enterFocus: 'الدخول إلى وضع التركيز',
		exitFocus: 'الخروج من وضع التركيز',
		focusShort: 'تركيز',
		close: 'إغلاق',
		manage: 'إدارة'
	},

	common: {
		done: 'تم',
		cancel: 'إلغاء',
		save: 'حفظ',
		delete: 'حذف',
		edit: 'تعديل',
		undo: 'تراجع',
		reset: 'إعادة تعيين',
		saveChanges: 'حفظ التغييرات',
		optional: 'اختياري'
	},

	counter: {
		tapAnywhere: 'اضغط في أي مكان للعدّ',
		hint: 'اضغط في أي مكان للعدّ · Esc للخروج من وضع التركيز',
		loading: 'جارٍ التحميل…',
		resetCounter: 'إعادة تعيين العدّاد',
		today: 'اليوم {count}',
		streakShort: '{count} يوم متتالٍ',
		goalShort: '{count}٪ من الهدف',
		totalShort: 'الإجمالي {count}',
		of: 'من {target}',
		complete: 'مكتمل',
		full: '{count} من {target}'
	},

	auto: {
		start: 'عدّ تلقائي',
		pause: 'إيقاف · {seconds}ث',
		resume: 'استئناف',
		unit: 'ث',
		every: 'كل {seconds} ثانية',
		oneEvery: 'عدّة واحدة كل {seconds} ثانية',
		running: 'تم العدّ {count} مرة تلقائيًا · اضغط في أي مكان للعدّ يدويًا',
		stoppedOnHide: 'أُوقف العدّ التلقائي لأن التطبيق كان في الخلفية'
	},

	celebration: {
		targetReached: 'تم بلوغ الهدف {target}',
		completed: 'اكتمل الهدف'
	},

	zikr: {
		heading: 'الأذكار',
		add: '＋ إضافة ذكر مخصص',
		edit: 'عدّ هذا الذكر',
		target: 'الهدف {target}',
		noTarget: 'بدون هدف',
		stats: '{session} في هذه الجلسة · {total} إجمالًا',
		moveUp: 'نقل {name} إلى الأعلى',
		moveDown: 'نقل {name} إلى الأسفل',
		confirmDelete: 'تأكيد الحذف',
		save: 'حفظ الذكر',
		form: {
			translit: 'النَّطق',
			arabic: 'النص العربي',
			meaning: 'المعنى',
			target: 'الهدف',
			translitPlaceholder: 'مثال: يا حيّ',
			arabicPlaceholder: 'يَا حَيُّ',
			meaningPlaceholder: 'الحيُّ القيّوم',
			infiniteHelp: 'عدٌّ حرّ بلا هدف محدد.',
			targetHelp: 'يحتفي العدّاد في كل مرة يبلغ فيها هذا الرقم.'
		}
	},

	stats: {
		heading: 'الإحصائيات',
		today: 'اليوم',
		goalLabel: 'الهدف {goal}',
		dayStreak: 'يوم متتالٍ',
		bestStreak: 'أفضل سلسلة',
		activeDays: 'أيام نشطة',
		dailyGoal: 'هدف اليوم',
		lifetime: 'الإجمالي',
		totalCounted: 'مجموع الأذكار المسجّلة',
		trend: 'الاتجاه',
		rangeDays: '{range} ي',
		periodLabel: 'خلال آخر {range} يومًا',
		average: 'المعدل {count} يوميًا',
		bestDay: 'أفضل يوم: {count} في {date}',
		activity: 'النشاط',
		backup: 'النسخ الاحتياطي والتصدير',
		exportJson: 'تصدير JSON',
		exportHistory: 'تصدير السجل CSV',
		exportDaily: 'تصدير اليوميات CSV',
		importJson: 'استيراد JSON',
		clearHistory: 'مسح السجل…',
		erased: 'تم مسح السجل.',
		less: 'أقل',
		more: 'أكثر',
		imported: 'تم استيراد {count} سجلًا.',
		failed: 'حدث خطأ ما.',
		tooltip: {
			one: '{date} — ذكر واحد',
			two: '{date} — ذكران',
			few: '{date} — {count} أذكار',
			many: '{date} — {count} ذكرًا',
			other: '{date} — {count} ذكر'
		}
	},

	settings: {
		heading: 'الإعدادات',
		appearance: 'المظهر',
		theme: {
			label: 'السمة',
			dark: 'داكنة',
			light: 'فاتحة',
			system: 'النظام'
		},
		backdrop: 'الخلفية',
		gradients: {
			label: 'الخلفية',
			emerald: 'زمردية',
			midnight: 'منتصف الليل',
			sand: 'رمادية',
			dusk: 'الغسق'
		},
		pattern: {
			label: 'الزخرفة',
			none: 'بدون',
			girih: 'قره',
			stars: 'نجوم',
			waves: 'أمواج'
		},
		beads: 'عدد حبّات السبحة',
		showArabic: 'إظهار العربية',
		showTranslation: 'إظهار المعنى',
		sound: 'الصوت',
		sounds: {
			label: 'الصوت',
			wood: 'خشبي',
			mech: 'ميكانيكي',
			soft: 'هادئ',
			none: 'صامت'
		},
		volume: 'مستوى الصوت',
		haptics: 'الاهتزاز اللمسي',
		goals: 'الأهداف',
		dailyGoal: 'هدف اليوم',
		autoInterval: 'الفاصل الزمني للعدّ التلقائي',
		zenOnLaunch: 'البدء في وضع التركيز',
		app: 'التطبيق',
		language: 'اللغة',
		install: 'تثبيت ذِكْر',
		installed: 'مثبَّت — يعمل دون اتصال.',
		installHint: 'استخدم خيار «إضافة إلى الشاشة الرئيسية» في متصفحك لتثبيت التطبيق.',
		update: 'يتوفر تحديث — أعد التحميل',
		reset: 'إعادة تعيين بيانات التطبيق…',
		resetWarn: 'سيتم حذف بيانات ذِكْر على هذا الجهاز. صدّر نسخة احتياطية أولًا.',
		erase: 'حذف كل شيء'
	},

	a11y: {
		announcer: 'العدّاد',
		backdropClose: 'إغلاق',
		countAnnounce: '{name}: {count}',
		targetAnnounce: '{name}: {count}. تم بلوغ الهدف {target}.',
		volumePercent: '{count} بالمئة'
	},

	export: {
		invalidJson: 'هذا الملف ليس بصيغة JSON صالحة.',
		notBackup: 'لا يبدو هذا الملف نسخة احتياطية من ذِكْر.'
	}
};