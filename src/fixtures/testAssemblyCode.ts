/**
 * Test fixtures for assembly code testing
 */

export const validAssemblyCode = {
  simple: `
    .org $0200
    LDA #$01
    STA $0300
    BRK
  `,
  
  withLabels: `
    .org $0200
    start:
      LDA #$05
      BNE loop
      BRK
    loop:
      DEX
      BNE start
  `,
  
  allDirectives: `
    .org $0200
    start:
      LDA offset_hi
      STA $01
      BRK
    
    offset_lo: .res 1
    offset_hi: .res 1
    word_data: .word $1234, $5678
    dword_data: .dword $12345678
    message: .ascii "Hello!", 1, 0
    c_string: .asciiz "Test"
  `,
  
  mixedAscii: `
    .org $0200
    message: .ascii "Hello, World!", 13, 10, 0
    greeting: .ascii "Hi", 32, "there!", 13, 10
    mixed: .asciiz "Value: ", $30, $31, $32
  `,
  
  allAddressingModes: `
    .org $0200
    ; Immediate
    LDA #$FF
    LDX #123
    
    ; Zero Page
    STA $10
    STX $20
    
    ; Absolute
    STA $1000
    STX $2000
    
    ; Indexed
    STA $10,X
    STX $20,Y
    STA $1000,X
    STX $2000,Y
    
    ; Indirect
    JMP ($FFFC)
    LDA ($10,X)
    STA ($20),Y
  `,
  
  branches: `
    .org $0200
    start:
      LDX #$05
    countdown:
      DEX
      CPX #$00
      BNE countdown
      BEQ done
    done:
      BRK
  `,
  
  forwardReferences: `
    .org $0200
    start:
      LDA message
      JMP end
    
    message: .byte $42
    end:
      BRK
  `,
};

export const invalidAssemblyCode = {
  unknownInstruction: `
    .org $0200
    INVALID #$01
  `,
  
  invalidOperand: `
    .org $0200
    LDA #$XYZ
  `,
  
  duplicateLabel: `
    .org $0200
    label:
      NOP
    label:
      NOP
  `,
  
  undefinedLabel: `
    .org $0200
    LDA undefined_label
  `,
  
  invalidDirective: `
    .org $0200
    .invalid 123
  `,
  
  invalidOrgFormat: `
    .org $GGGG
  `,
  
  outOfRangeByte: `
    .org $0200
    .byte 256
  `,
  
  outOfRangeWord: `
    .org $0200
    .word 65536
  `,
  
  unterminatedString: `
    .org $0200
    .ascii "unterminated
  `,
  
  invalidRelativeBranch: `
    .org $0200
    start:
      NOP
    faraway:
      .org $0300
      BNE start  ; Too far for relative branch
  `,
};

export const expectedMachineCode = {
  simple: [0xA9, 0x01, 0x8D, 0x00, 0x03, 0x00],
  
  ldaImmediate: [0xA9, 0xFF], // LDA #$FF
  ldxImmediate: [0xA2, 0x7B], // LDX #123
  
  staZeroPage: [0x85, 0x10],  // STA $10
  stxZeroPage: [0x86, 0x20],  // STX $20
  
  staAbsolute: [0x8D, 0x00, 0x10], // STA $1000 (little-endian)
  stxAbsolute: [0x8E, 0x00, 0x20], // STX $2000 (little-endian)
  
  brkInstruction: [0x00],     // BRK
  nopInstruction: [0xEA],     // NOP
  
  // ASCII examples
  helloBytes: [72, 101, 108, 108, 111], // "Hello"
  helloWithComma: [72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33], // "Hello, World!"
  
  // Word examples (little-endian)
  word1234: [0x34, 0x12],     // $1234 -> 52, 18
  word5678: [0x78, 0x56],     // $5678 -> 120, 86
  
  // Dword examples (little-endian)  
  dword12345678: [0x78, 0x56, 0x34, 0x12], // $12345678 -> 120, 86, 52, 18
};

export const addressingModeTests = [
  {
    name: 'Immediate addressing',
    code: 'LDA #$42',
    expected: [0xA9, 0x42],
  },
  {
    name: 'Zero page addressing',
    code: 'LDA $42',
    expected: [0xA5, 0x42],
  },
  {
    name: 'Absolute addressing',
    code: 'LDA $1234',
    expected: [0xAD, 0x34, 0x12],
  },
  {
    name: 'Zero page X addressing',
    code: 'LDA $42,X',
    expected: [0xB5, 0x42],
  },
  {
    name: 'Absolute X addressing',
    code: 'LDA $1234,X',
    expected: [0xBD, 0x34, 0x12],
  },
  {
    name: 'Absolute Y addressing',
    code: 'LDA $1234,Y',
    expected: [0xB9, 0x34, 0x12],
  },
  {
    name: 'Indirect X addressing',
    code: 'LDA ($42,X)',
    expected: [0xA1, 0x42],
  },
  {
    name: 'Indirect Y addressing',
    code: 'LDA ($42),Y',
    expected: [0xB1, 0x42],
  },
];

export const branchTests = [
  {
    name: 'BNE forward branch',
    code: `
      BNE end
      NOP
      end: NOP
    `,
    expected: [0xD0, 0x01, 0xEA, 0xEA], // BNE +1, NOP, NOP
  },
  {
    name: 'BNE backward branch',
    code: `
      start: NOP
      BNE start
    `,
    expected: [0xEA, 0xD0, 0xFD], // NOP, BNE -3
  },
];

export const performanceTestCode = {
  large: `
    .org $0200
    ${Array.from({ length: 256 }, (_, i) => `    LDA #$${i.toString(16).padStart(2, '0')}`).join('\n')}
    BRK
  `,
  
  manyLabels: `
    .org $0200
    ${Array.from({ length: 100 }, (_, i) => `label${i}: NOP`).join('\n')}
  `,
};