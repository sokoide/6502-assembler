
export interface SampleCode {
  name: string;
  code: string;
}

export const sampleCodes: SampleCode[] = [
  {
    name: "1. Basic Storage",
    code: `\t.org $0200\n
start:
\tLDA #$01
\tSTA $0300
\tLDA #$05
\tSTA $0301
\tLDA #$08
\tSTA $0302
\tBRK`
  },
  {
    name: "2. Labels & Infinite Loop",
    code: `\t.org $0200\n
start:
\tLDA #$01
\tSTA $0300
loop:
\tINC $0300
\tJMP loop`
  },
  {
    name: "3. Load from Memory",
    code: `\t.org $0200\n
start:
\tLDA #$C0
\tSTA $00     ; Store $C0 in address $00 (Zero Page)
\tLDA $00     ; Load the value from address $00
\tSTA $0300   ; Store it in $0300 to observe
\tBRK`
  },
  {
    name: "4. LDX, LDY, STX, STY",
    code: `\t.org $0200\n
start:
\tLDX #$0A
\tLDY #$0B
\tSTX $0300
\tSTY $0301
\tBRK`
  },
  {
    name: "5. Branching (BNE)",
    code: `\t.org $0200\n
start:
\tLDX #$05
countdown:
\t  DEX
\t  CPX #$00
\t  BNE countdown ; Branch if X is not zero
\t  LDA #$AA    ; Signal completion
\t  STA $0300
\t  BRK`
  },
  {
    name: "6. Subroutine (JSR/RTS)",
    code: `\t.org $0200\n
start:
\tJSR setup_values
\tLDA #$01      ; Executed after RTS
\tSTA $0300
\tBRK

setup_values:
\tLDA #$AA
\tSTA $0301     ; Value set by subroutine
\tLDX #$BB
\tSTX $0302     ; Another value
\tRTS`
  },
  {
    name: "7. Stack Operations",
    code: `\t.org $0200\n
start:
\tLDA #$AA
\tPHA       ; Push A ($AA) onto stack
\tLDA #$BB  ; A is now $BB
\tPHA       ; Push A ($BB) onto stack
\tPLA       ; Pull from stack to A (A becomes $BB)
\tSTA $0300 ; Store $BB
\tPLA       ; Pull from stack to A (A becomes $AA)
\tSTA $0301 ; Store $AA
\tBRK`
  },
  {
    name: "8. Fill Memory Loop (Absolute,X)",
    code: `\t.org $0200\n
start:
\tLDX #$00
\tLDA #$42    ; Value to store
fill_loop:
\tSTA $0300,X ; Store value at $0300 + X
\tINX
\tCPX #$0A    ; Fill 10 bytes (0 to 9)
\tBNE fill_loop
\tBRK`
  },
  {
    name: "9. Compare and Branch (BEQ)",
    code: `\t.org $0200\n
start:
\tLDA #$10
\tCMP #$10  ; Compare A with #$10
\tBEQ equal ; Branch if A == #$10
\tLDA #$00  ; A was not $10
\tSTA $0300
\tJMP done
equal:
\tLDA #$FF  ; A was $10
\tSTA $0300
done:
\tBRK`
  },
  {
    name: "10. Indirect Addressing (ZP),Y",
    code: `\t.org $0200\n
start:
\tLDA #$00    ; Low byte of pointer ($30)
\tSTA $30     ; Store at ZP address $30
\tLDA #$03    ; High byte of pointer ($03 for $0300)
\tSTA $31     ; Store at ZP address $31
\t            ; So, ($30) points to $0300
\t
\tLDA #$CC    ; Value to store at $0300
\tSTA $0300   ; Directly store CC at $0300 for verification
\t
\tLDY #$00    ; Y = 0
\tLDA ($30),Y ; Load from address pointed to by ($30)+Y
\t            ; which is ($0300)+0 = $0300. A should be $CC.
\tSTA $0301   ; Store the loaded value at $0301
\tBRK`
  },
  {
    name: "11. Low/High Byte Immediate",
    code: `\t.org $0200\n
start:
; assuming org is $0200, so target_label is $020B
\tLDX #<target_label ; X = $0B
\tSTX $0300
\tLDY #>target_label ; Y = $02
\tSTY $0301
\tBRK
\t
\ttarget_label: NOP ; Address is $0215 after BRK
`
  }
];
