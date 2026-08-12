import type { Session } from 'koishi'

export type LoggerInfo = (...args: unknown[]) => void
export type ExtractImageUrl = (session: Session, input: string) => Promise<string>

export interface Command1Config {
  enablecommand1: boolean
  enablecommand1Name?: string
  enablecommand1Name2?: string
  Full_color_output?: boolean
  Output_Size?: number
  Mixed_Weight?: number
}

export interface Command2Config {
  enablecommand2: boolean
  enablecommand2Name?: string
  pixelate?: number
}

export interface Command3Config {
  enablecommand3: boolean
  enablecommand3Name?: string
  cameraAlignmentLogic?: string
  camerascreenshotquality?: number
}

export interface Command4Config {
  enablecommand4: boolean
  enablecommand4Name?: string
  enablecommand4Name2?: string
  Full_color_output?: boolean
  Inner_Threshold?: number
  Cover_Threshold?: number
  Inner_Contrast?: number
  Cover_Contrast?: number
  Output_Size?: number
  Is_Reverse?: boolean
  Encode_Method?: string
  Decode_Threshold?: number
  Decode_Option?: string
}

export interface Command5Config {
  enablecommand5: boolean
  enablecommand5Name?: string
  sendAsFile?: boolean
  loopCount?: number
  finalDelay?: number
}

export interface Command6Config {
  enablecommand6: boolean
  enablecommand6Name?: string
  extractName?: string
  composeName?: string
  firstFrameDelay?: number
  background?: string
}

export interface PatinaConfig extends Command1Config, Command2Config, Command3Config, Command4Config, Command5Config, Command6Config {
  loggerinfo: boolean
}
