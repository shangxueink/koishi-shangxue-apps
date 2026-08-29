export default class Emoji {
  static readonly apngMap = new Map<number, { super: boolean; suffix: number[] }>()
  static readonly descMap = new Map<string, string>()
  static readonly allList = new Set<number>()
  static readonly allSuperList = new Set<number>()
  static readonly normalList: readonly number[] = []

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
    public type: 'emoji',
    public hasSuper: boolean,
    public superSuffix: number[],
  ) {
    if (superSuffix.length > 0) {
      this.suffixId = superSuffix[0]
    }
  }

  static get(id: number): Emoji | undefined {
    if (id < 5000) return undefined
    return new Emoji(id, 'emoji', false, [])
  }

  static has(id: number): boolean {
    return id >= 5000
  }

  static get responseId(): readonly number[] {
    return this.responseEmojiId
  }

  get description(): string {
    return Emoji.descMap.get(this.id.toString()) || '表情'
  }

  get value(): string {
    return String.fromCodePoint(this.id)
  }

  get superValue(): string | undefined {
    return undefined
  }
}
