class HowlingAnimalsTranslator {

        constructor(newAnimalVoice = "嗷呜啊~") {
          this.setAnimalVoice(newAnimalVoice);
        }
      
        convert(txt = "") {
          txt = txt.trim();
          if (txt.length < 1) {
            return "";
          }
          let result = this.animalVoice[3] + this.animalVoice[1] + this.animalVoice[0];
          let offset = 0;
          for (const t of txt) {
            let c = t.charCodeAt(0);
            let b = 12;
            while (b >= 0) {
              let hex = ((c >> b) + offset) & 15;
              offset += 1;
              result += this.animalVoice[Math.floor(hex / 4)];
              result += this.animalVoice[hex & 3];
              b -= 4;
            }
          }
          result += this.animalVoice[2];
          return result;
        }
      
        deConvert(txt) {
          txt = txt.trim();
          if (!this.identify(txt)) {
            return "Incorrect format!";
          }
          let result = "";
          let i = 3;
          let offset = 0;
          while (i < txt.length - 1) {
            let c = 0;
            let b = i + 8;
            while (i < b) {
              let n1 = this.animalVoice.indexOf(txt[i++]);
              let n2 = this.animalVoice.indexOf(txt[i++]);
              c = (c << 4) | (((n1 << 2) | n2) + offset) & 15;
              if (offset === 0) {
                offset = Math.pow(0x10000, 2) - 1;
              } else {
                offset -= 1;
              }
            }
            result += String.fromCharCode(c);
          }
          return result;
        }
      
        identify(txt) {
          if (txt) {
            txt = txt.trim();
            if (txt.length > 11) {
              if (txt[0] === this.animalVoice[3] && txt[1] === this.animalVoice[1] && txt[2] === this.animalVoice[0] && txt[txt.length - 1] === this.animalVoice[2] && ((txt.length - 4) % 8) === 0) {
                for (const t of txt) {
                  if (!this.animalVoice.includes(t)) {
                    return false;
                  }
                }
                return true;
              }
            }
          }
          return false;
        }
      
        setAnimalVoice(voiceTxt) {
          if (voiceTxt) {
            voiceTxt = voiceTxt.trim();
            if (voiceTxt.length === 4) {
              this.animalVoice = voiceTxt;
              return true;
            }
          }
          return false;
        }
      
        getAnimalVoice() {
          return this.animalVoice;
        }
      
  }
  
  module.exports = HowlingAnimalsTranslator;