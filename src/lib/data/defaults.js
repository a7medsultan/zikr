/**
 * The dhikrs offered on first run. `meaning` is the English fallback; any
 * locale listed in `meanings` overrides it. `arabic` is always the Arabic text
 * regardless of the interface language, since that is the text being recited.
 */
export const DEFAULT_ZIKRS = [
	{
		id: 'subhanallah',
		arabic: 'سُبْحَانَ ٱللَّٰهِ',
		translit: 'SubḥānAllāh',
		meaning: 'Glory be to Allah',
		meanings: { ar: 'سبحان الله' },
		target: 33,
		order: 0,
		builtin: true
	},
	{
		id: 'alhamdulillah',
		arabic: 'ٱلْحَمْدُ لِلَّٰهِ',
		translit: 'Al-ḥamdu lillāh',
		meaning: 'All praise is for Allah',
		meanings: { ar: 'الحمد لله' },
		target: 33,
		order: 1,
		builtin: true
	},
	{
		id: 'allahuakbar',
		arabic: 'ٱللَّهُ أَكْبَرُ',
		translit: 'Allāhu akbar',
		meaning: 'Allah is the Greatest',
		meanings: { ar: 'الله أكبر' },
		target: 34,
		order: 2,
		builtin: true
	},
	{
		id: 'astaghfirullah',
		arabic: 'أَسْتَغْفِرُ ٱللَّهَ',
		translit: 'Astaghfirullāh',
		meaning: 'I seek forgiveness from Allah',
		meanings: { ar: 'أستغفر الله' },
		target: 100,
		order: 3,
		builtin: true
	},
	{
		id: 'lailahaillallah',
		arabic: 'لَا إِلَٰهَ إِلَّا ٱللَّهُ',
		translit: 'Lā ilāha illā Allāh',
		meaning: 'There is no god but Allah',
		meanings: { ar: 'لا إله إلا الله' },
		target: 100,
		order: 4,
		builtin: true
	},
	{
		id: 'hawqala',
		arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّهِ',
		translit: 'Lā ḥawla wa lā quwwata illā billāh',
		meaning: 'There is no power nor strength except with Allah',
		meanings: { ar: 'لا حول ولا قوة إلا بالله' },
		target: 100,
		order: 5,
		builtin: true
	},
	{
		id: 'salawat',
		arabic: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّد',
		translit: 'Allāhumma ṣalli ʿalā Muḥammad',
		meaning: 'O Allah, send blessings upon Muhammad',
		meanings: { ar: 'اللهم صل على محمد' },
		target: 10,
		order: 6,
		builtin: true
	}
];

/** The meaning in the active language, falling back to what the user typed. */
export function meaningOf(zikr, code) {
	// `translation` is the field name used by backups written before localisation.
	return zikr?.meanings?.[code] ?? zikr?.meaning ?? zikr?.translation ?? '';
}