import * as api from './brt-codec'

function toHex(bytes: Buffer) {
  return Buffer.from(bytes).toString('hex').toUpperCase()
}

function toBytes(hex: string) {
  return Buffer.from(hex, 'hex')
}

/**
 * Create a test case for encoding data and a test case for decoding data.
 *
 * @param encoder Encoder function to test
 * @param decoder Decoder function to test
 * @param base58 Base58-encoded string to decode
 * @param hex Hexadecimal representation of expected decoded data
 */
function makeEncodeDecodeTest(encoder: Function, decoder: Function, base58: string, hex: string) {
  test(`can translate between ${hex} and ${base58}`, function() {
    const actual = encoder(toBytes(hex))
    expect(actual).toBe(base58)
  })
  test(`can translate between ${base58} and ${hex})`, function() {
    const buf = decoder(base58)
    expect(toHex(buf)).toBe(hex)
  })
}

makeEncodeDecodeTest(api.encodeAccountID, api.decodeAccountID, '13cHUa7Zw3yQKW5EdBefC11NcWXcw7eMUM',
  '1C9C902BD2408F10552509CAD5966C023084C756')

makeEncodeDecodeTest(api.encodeNodePublic, api.decodeNodePublic,
  '6BR3QWyUgtndBiYEWMLTvr37dvgScVctTUCagtCQUx79aZXuPySA',
  '0388E5BA87A000CB807240DF8C848EB0B5FFA5C8E5A521BC8E105C0F0A44217828')

  makeEncodeDecodeTest(api.encodeAccountPublic, api.decodeAccountPublic,
    'aB44YfzW24VDEJQ2UuLPV2PvqcPCSoLnL7y5M1EzhdW4LnK5xMS3',
    '023693F15967AE357D0327974AD46FE3C127113B1110D6044FD41E723689F81CC6')

test('isValidClassicAddress - secp256k1 address valid', function() {
  expect(api.isValidClassicAddress('13cHUa7Zw3yQKW5EdBefC11NcWXcw7eMUM')).toBe(true)
})

test('isValidClassicAddress - invalid', function() {
  expect(api.isValidClassicAddress('13cHUa7Zw3yQKW5EdBefC11NcWXcw7eMUl')).toBe(false)
})

test('isValidClassicAddress - empty', function() {
  expect(api.isValidClassicAddress('')).toBe(false)
})

describe('encodeSeed', function() {

  it('encodes a secp256k1 seed', function() {
    const result = api.encodeSeed(Buffer.from('CF2DE378FBDD7E2EE87D486DFB5A7BFF', 'hex'))
    expect(result).toBe('35ai91FpX1Q1Wyx8QUX5eWcAVhd7L')
  })

  it('encodes low secp256k1 seed', function() {
    const result = api.encodeSeed(Buffer.from('00000000000000000000000000000000', 'hex'))
    expect(result).toBe('32hJSU7sNBuApYnMAhbTtLKW6uoC3')
  })

  it('encodes high secp256k1 seed', function() {
    const result = api.encodeSeed(Buffer.from('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 'hex'))
    expect(result).toBe('36GABRReqCEKuWEL2CwqnrnEkXFPE')
  })

  test('attempting to encode a seed with less than 16 bytes of entropy throws', function() {
    expect(() => {
      api.encodeSeed(Buffer.from('CF2DE378FBDD7E2EE87D486DFB5A7B', 'hex'))
    }).toThrow('entropy must have length 16')
  })

  test('attempting to encode a seed with more than 16 bytes of entropy throws', function() {
    expect(() => {
      api.encodeSeed(Buffer.from('4FB52B1382DF48C29A7ACC129842537E', 'hex'))
    }).toThrow('entropy must have length 16')
  })
})

describe('decodeSeed', function() {

  it('can decode a secp256k1 seed', function() {
    const decoded = api.decodeSeed('sn259rEFXrQrWyx3Q7XneWcwV6dfL')
    expect(toHex(decoded.bytes)).toBe('CF2DE378FBDD7E2EE87D486DFB5A7BFF')
    expect(decoded.type).toBe('secp256k1')
  })
})

describe('encodeAccountID', function() {

  it('can encode an AccountID', function() {
    const encoded = api.encodeAccountID(Buffer.from('BA8E78626EE42C41B46D46C3048DF3A1C3C87072', 'hex'))
    expect(encoded).toBe('rJrRMgiRgrU6hDF4pgu5DXQdWyPbY35ErN')
  })

  test('unexpected length should throw', function() {
    expect(() => {
      api.encodeAccountID(Buffer.from('ABCDEF', 'hex'))
    }).toThrow(
      'unexpected_payload_length: bytes.length does not match expectedLength'
    )
  })
})

describe('decodeNodePublic', function() {

  it('can decode a NodePublic', function() {
    const decoded = api.decodeNodePublic('n9MXXueo837zYH36DvMc13BwHcqtfAWNJY5czWVbp7uYTj7x17TH')
    expect(toHex(decoded)).toBe('0388E5BA87A000CB807240DF8C848EB0B5FFA5C8E5A521BC8E105C0F0A44217828')
  })
})

test('encodes 123456789 with version byte of 0', () => {
  expect(api.codec.encode(Buffer.from('123456789'), {
    versions: [0],
    expectedLength: 9
  })).toBe('rnaC7gW34M77Kneb78s')
})

test('multiple versions with no expected length should throw', () => {
  expect(() => {
    api.codec.decode('rnaC7gW34M77Kneb78s', {
      versions: [0, 1]
    })
  }).toThrow('expectedLength is required because there are >= 2 possible versions')
})

test('attempting to decode data with length < 5 should throw', () => {
  expect(() => {
    api.codec.decode('1234', {
      versions: [0]
    })
  }).toThrow('invalid_input_size: decoded data must have length >= 5')
})

test('attempting to decode data with unexpected version should throw', () => {
  expect(() => {
    api.codec.decode('rnaC7gW34M77Kneb78s', {
      versions: [2]
    })
  }).toThrow('version_invalid: version bytes do not match any of the provided version(s)')
})

test('invalid checksum should throw', () => {
  expect(() => {
    api.codec.decode('123456789', {
      versions: [0, 1]
    })
  }).toThrow('checksum_invalid')
})

test('empty payload should throw', () => {
  expect(() => {
    api.codec.decode('', {
      versions: [0, 1]
    })
  }).toThrow('invalid_input_size: decoded data must have length >= 5')
})

test('decode data', () => {
  expect(api.codec.decode('rnaC7gW34M77Kneb78s', {
    versions: [0]
  })).toStrictEqual({
    version: [0],
    bytes: Buffer.from('123456789'),
    type: null
  })
})

test('decode data with expected length', function() {
  expect(api.codec.decode('rnaC7gW34M77Kneb78s', {
      versions: [0],
      expectedLength: 9
    })
    ).toStrictEqual({
      version: [0],
      bytes: Buffer.from('123456789'),
      type: null
    })
})

test('decode data with wrong expected length should throw', function() {
  expect(() => {
    api.codec.decode('rnaC7gW34M77Kneb78s', {
      versions: [0],
      expectedLength: 8
    })
  }).toThrow(
    'version_invalid: version bytes do not match any of the provided version(s)'
  )
  expect(() => {
    api.codec.decode('rnaC7gW34M77Kneb78s', {
      versions: [0],
      expectedLength: 10
    })
  }).toThrow(
    'version_invalid: version bytes do not match any of the provided version(s)'
  )
})
