export default class Emoji {
  static readonly apngMap = new Map<number, { super: boolean; suffix: number[] }>()
  static readonly descMap = new Map<string, string>()
  static readonly allList = new Set<number>()
  static readonly allSuperList = new Set<number>()

  static readonly superList: readonly number[] = [
    5, 311, 312, 314, 317, 318, 319, 320, 324, 325, 337,
    338, 339, 341, 342, 343, 344, 345, 346, 181, 74, 75,
    351, 349, 350, 395, 114, 326, 53, 137, 333, 424, 415,
    392, 425, 427, 426, 419, 429, 472, 474, 475, 476, 477,
    478, 479,
  ]

  static readonly normalList: readonly number[] = [
    14, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 0, 15, 16,
    96, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    31, 32, 33, 34, 35, 36, 37, 38, 39, 97, 98, 99, 100,
    101, 102, 103, 104, 105, 106, 107, 108, 305, 109, 110,
    111, 172, 182, 179, 173, 174, 212, 175, 178, 177, 176,
    183, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271,
    272, 277, 307, 306, 281, 282, 283, 284, 285, 293, 286,
    287, 289, 294, 297, 298, 299, 300, 323, 332, 336, 353,
    355, 356, 354, 352, 357, 428, 334, 347, 303, 302, 295,
    49, 66, 63, 64, 187, 146, 116, 67, 60, 185, 76, 124,
    118, 78, 119, 79, 120, 121, 77, 123, 201, 273, 46, 112,
    56, 169, 171, 59, 144, 147, 148, 89, 41, 125, 42, 43, 86, 129,
    85,
  ]

  static readonly emojiList: readonly number[] = [
    128522, 128524, 128538, 128531, 128560, 128541, 128513, 128540,
    9786, 128525, 128532, 128516, 128527, 128530, 128563, 128536,
    128557, 128561, 128514, 128170, 128074, 128077, 128079, 128078,
    128591, 128076, 128070, 128064, 127836, 127847, 127838, 127866,
    127867, 9749, 127822, 127827, 127817, 128684, 127801, 127881,
    128157, 128163, 10024, 128168, 128166, 128293, 128164, 128169,
    128137, 128235, 128014, 128103, 128102, 128053, 128055, 128046,
    128020, 128056, 128123, 128027, 128054, 128051, 128098, 9728,
    10068, 128299, 128147, 127978,
  ]

  static readonly responseApngId: readonly number[] = [
    5, 314, 318, 319, 320, 324, 337, 338, 339, 341, 342, 343, 344,
    345, 346, 181, 74, 75, 351, 349, 350, 395, 326, 53, 333, 424,
    425, 427, 426, 14, 4, 8, 9, 10, 12, 16, 96, 21, 23, 24, 25, 26,
    27, 28, 29, 30, 32, 33, 34, 38, 39, 97, 98, 99, 100, 101, 102,
    103, 104, 106, 305, 109, 111, 182, 179, 173, 174, 212, 175, 176,
    183, 262, 264, 265, 266, 267, 268, 269, 270, 271, 272, 277, 307,
    306, 281, 282, 284, 285, 293, 287, 289, 294, 297, 298, 299, 332,
    336, 353, 355, 356, 354, 352, 357, 428, 334, 347, 303, 302, 295,
    49, 66, 63, 116, 60, 76, 124, 118, 78, 79, 120, 123, 201, 273,
    171, 144, 147, 89, 41, 125, 42, 43, 129, 85,
  ]

  static readonly responseEmojiId: readonly number[] = [
    128522, 128524, 128538, 128531, 128560, 128541, 128513, 128540,
    9786, 128532, 128516, 128527, 128530, 128563, 128536, 128557,
    128514, 128170, 128074, 128077, 128079, 128076, 127836, 127847,
    127838, 127866, 127867, 9749, 127822, 127827, 127817, 127801,
    127881, 128157, 10024, 128168, 128166, 128293, 128164, 128235,
    128103, 128102, 128053, 128046, 128027, 128051, 9728, 10068,
    128147,
  ]

  private suffixId?: number

  private constructor(
    public id: number,
    public type: 'apng' | 'emoji',
    public hasSuper: boolean,
    public superSuffix: number[],
  ) {
    if (superSuffix.length > 0) {
      this.suffixId = superSuffix[0]
    }
  }

  static get(id: number): Emoji | undefined {
    if (id < 5000) {
      const value = this.apngMap.get(id)
      return value ? new Emoji(id, 'apng', value.super, value.suffix) : undefined
    }
    return new Emoji(id, 'emoji', false, [])
  }

  static has(id: number): boolean {
    return id >= 5000 || this.apngMap.has(id)
  }

  static init() {
    for (const id of [...this.superList, ...this.normalList, ...this.responseApngId]) {
      const isSuper = this.superList.includes(id)
      this.apngMap.set(id, { super: isSuper, suffix: [] })
      if (isSuper) this.allSuperList.add(id)
      this.allList.add(id)
    }
  }

  static get responseId(): readonly number[] {
    return [...this.responseApngId, ...this.responseEmojiId]
  }

  get description(): string {
    return Emoji.descMap.get(this.id.toString()) || '表情'
  }

  get value(): string {
    return this.type === 'apng' ? this.getNormalUrl(this.id) : String.fromCodePoint(this.id)
  }

  get superValue(): string | undefined {
    if (!this.hasSuper) return undefined
    return this.getSuperUrl(this.id, this.suffixId)
  }

  private getNormalUrl(id: number): string {
    return `https://lib.stapxs.cn/download/stapxs-qq-lite/qq_emoji/${id}/apng/${id}.png`
  }

  private getSuperUrl(id: number, suffix?: number): string {
    const name = suffix ? `${id}_${suffix}` : `${id}`
    return `https://lib.stapxs.cn/download/stapxs-qq-lite/qq_emoji/${id}/lottie/${name}.json`
  }
}

setTimeout(Emoji.init.bind(Emoji), 0)
