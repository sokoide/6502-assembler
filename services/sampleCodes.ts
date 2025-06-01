
export interface SampleCode {
  name: string;
  code: string;
}

export const sampleCodes: SampleCode[] = [
  {
    name: "1. Basic Storage",
    code: `\t.org $0200\n
LDA #$01
STA $0300
LDA #$05
STA $0301
LDA #$08
STA $0302
BRK`
  },
  {
    name: "2. Labels & Infinite Loop",
    code: `\t.org $0200\n
LDA #$01
STA $0300
LOOP:
INC $0300
JMP LOOP`
  },
  {
    name: "3. Load from Memory",
    code: `\t.org $0200\n
LDA #$C0
STA $00     ; Store $C0 in address $00 (Zero Page)
LDA $00     ; Load the value from address $00
STA $0300   ; Store it in $0300 to observe
BRK`
  },
  {
    name: "4. LDX, LDY, STX, STY",
    code: `\t.org $0200\n
LDX #$0A
LDY #$0B
STX $0300
STY $0301
BRK`
  },
  {
    name: "5. Branching (BNE)",
    code: `\t.org $0200\n
  LDX #$05
COUNTDOWN:
  DEX
  CPX #$00
  BNE COUNTDOWN ; Branch if X is not zero
  LDA #$AA    ; Signal completion
  STA $0300
  BRK`
  },
  {
    name: "6. Subroutine (JSR/RTS)",
    code: `\t.org $0200\n
  JSR SETUP_VALUES
  LDA #$01      ; Executed after RTS
  STA $0300
  BRK

SETUP_VALUES:
  LDA #$AA
  STA $0301     ; Value set by subroutine
  LDX #$BB
  STX $0302     ; Another value
  RTS`
  },
  {
    name: "7. Stack Operations",
    code: `\t.org $0200\n
  LDA #$AA
  PHA       ; Push A ($AA) onto stack
  LDA #$BB  ; A is now $BB
  PHA       ; Push A ($BB) onto stack
  PLA       ; Pull from stack to A (A becomes $BB)
  STA $0300 ; Store $BB
  PLA       ; Pull from stack to A (A becomes $AA)
  STA $0301 ; Store $AA
  BRK`
  },
  {
    name: "8. Fill Memory Loop (Absolute,X)",
    code: `\t.org $0200\n
  LDX #$00
  LDA #$42    ; Value to store
FILL_LOOP:
  STA $0300,X ; Store value at $0300 + X
  INX
  CPX #$0A    ; Fill 10 bytes (0 to 9)
  BNE FILL_LOOP
  BRK`
  },
  {
    name: "9. Compare and Branch (BEQ)",
    code: `\t.org $0200\n
  LDA #$10
  CMP #$10  ; Compare A with #$10
  BEQ EQUAL ; Branch if A == #$10
  LDA #$00  ; A was not $10
  STA $0300
  JMP DONE
EQUAL:
  LDA #$FF  ; A was $10
  STA $0300
DONE:
  BRK`
  },
  {
    name: "10. Indirect Addressing (ZP),Y",
    code: `\t.org $0200\n
  LDA #$00    ; Low byte of pointer ($30)
  STA $30     ; Store at ZP address $30
  LDA #$03    ; High byte of pointer ($03 for $0300)
  STA $31     ; Store at ZP address $31
              ; So, ($30) points to $0300

  LDA #$CC    ; Value to store at $0300
  STA $0300   ; Directly store CC at $0300 for verification

  LDY #$00    ; Y = 0
  LDA ($30),Y ; Load from address pointed to by ($30)+Y
              ; which is ($0300)+0 = $0300. A should be $CC.
  STA $0301   ; Store the loaded value at $0301
  BRK`
  },
  {
    name: "11. Low/High Byte Immediate",
    code: `\t.org $0200\n

LDX #<TARGET_LABEL ; X = $0B (assuming org is $0200, so TARGET_LABEL is $020B)
STX $0300
LDY #>TARGET_LABEL ; Y = $02
STY $0301
BRK

TARGET_LABEL: NOP ; Address is $0215 after BRK
`
  }
];
