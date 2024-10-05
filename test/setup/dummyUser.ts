const dummyUser = {
  id: 1,
  firstName: 'Emily',
  lastName: 'Johnson',
  maidenName: 'Smith',
  age: 28,
  gender: 'female',
  email: 'emily.johnson@x.dummyjson.com',
  phone: '+81 965-431-3024',
  username: 'emilys',
  password: 'emilyspass',
  birthDate: '1996-5-30',
  image: 'https://dummyjson.com/icon/emilys/128',
  bloodGroup: 'O-',
  height: 193.24,
  weight: 63.16,
  eyeColor: 'Green',
  hair: {
    color: 'Brown',
    type: 'Curly',
  },
  ip: '42.48.100.32',
  crypto: [
    {
      coin: 'Bitcoin',
      wallet: '0xb9fc2fe63b2a6c003f1c324c3bfa53259162181a',
      network: 'Ethereum (ERC20)',
    },
  ],
  address: {
    street: '626 Main Street',
    city: 'Phoenix',
    state: 'Mississippi',
    stateCode: 'MS',
    postalCode: '29112',
    coordinates: {
      lat: -77.16213,
      lng: -92.084824,
    },
    country: 'United States',
  },
  macAddress: '47:fa:41:18:ec:eb',
  university: 'University of Wisconsin--Madison',
  bank: {
    cardExpire: '03/26',
    cardNumber: '9289760655481815',
    cardType: 'Elo',
    currency: 'CNY',
    iban: 'YPUXISOBI7TTHPK2BR3HAIXL',
  },
  company: {
    department: 'Engineering',
    name: 'Dooley, Kozey and Cronin',
    title: 'Sales Manager',
    address: {
      address: '263 Tenth Street',
      city: 'San Francisco',
      state: 'Wisconsin',
      stateCode: 'WI',
      postalCode: '37657',
      coordinates: {
        lat: 71.814525,
        lng: -161.150263,
      },
      country: 'United States',
    },
  },
  ein: '977-175',
  ssn: '900-590-289',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36',
  role: 'admin',
}

const extendedDummyUser = {
  ...dummyUser,
  someCircular: {
    obj: {} as any,
  },
  someMap: new Map().set('someMap', 'bar'),
  someWeakMap: new WeakMap().set({ foo: 'bar' }, 'someWeakMap'),
  someSet: new Set().add('someSet'),
  someSymbol: Symbol('someSymbol'),
  someFunction: () => {
    throw new Error('someFunction oops')
  },
  somePromise: async () => {
    throw new Error('somePromise oops')
  },
  someClass: class {
    constructor(readonly foo = 'bar') {
    }
  },
  someError: new Error('someError oops'),
  someDate: new Date(),
  someRegExp: /someRegExp/gi,
  someBuffer: Buffer.from('someBuffer'),
  someArrayBuffer: new ArrayBuffer(8),
  someDataView: new DataView(new ArrayBuffer(8)),
  someInt8Array: new Int8Array(8),
  someBigInt64Array: new BigInt64Array(8),
  someBigUint64Array: new BigUint64Array(8),
  someFloat32Array: new Float32Array(8),
  someFloat64Array: new Float64Array(8),
  someInt16Array: new Int16Array(8),
  someInt32Array: new Int32Array(8),
  someBigInt: BigInt(9007199254740991),
  someFunctionArray: [() => {
    throw new Error('someFunctionArray oops')
  }],
  somePromiseArray: [async () => {
    throw new Error('somePromiseArray oops')
  }],
}

extendedDummyUser.someCircular.obj = extendedDummyUser

const dummyUserXml = `<dummyUser><id>1</id>
<firstName>Emily</firstName>
<lastName>Johnson</lastName>
<maidenName>Smith</maidenName>
<age>28</age>
<gender>female</gender>
<email>emily.johnson@x.dummyjson.com</email>
<phone>+81 965-431-3024</phone>
<username>emilys</username>
<password>emilyspass</password>
<birthDate>1996-5-30</birthDate>
<image>https://dummyjson.com/icon/emilys/128</image>
<bloodGroup>O-</bloodGroup>
<height>193.24</height>
<weight>63.16</weight>
<eyeColor>Green</eyeColor>
<hair>
    <color>Brown</color>
    <type>Curly</type>
</hair>
<ip>42.48.100.32</ip>
<crypto>
    <coin>Bitcoin</coin>
    <wallet>0xb9fc2fe63b2a6c003f1c324c3bfa53259162181a</wallet>
    <network>Ethereum (ERC20)</network>
</crypto>
<address>
    <street>626 Main Street</street>
    <city>Phoenix</city>
    <state>Mississippi</state>
    <stateCode>MS</stateCode>
    <postalCode>29112</postalCode>
    <coordinates>
        <lat>-77.16213</lat>
        <lng>-92.084824</lng>
    </coordinates>
    <country>United States</country>
</address>
<macAddress>47:fa:41:18:ec:eb</macAddress>
<university>University of Wisconsin--Madison</university>
<bank>
    <cardExpire>03/26</cardExpire>
    <cardNumber>9289760655481815</cardNumber>
    <cardType>Elo</cardType>
    <currency>CNY</currency>
    <iban>YPUXISOBI7TTHPK2BR3HAIXL</iban>
</bank>
<company>
    <department>Engineering</department>
    <name>Dooley, Kozey and Cronin</name>
    <title>Sales Manager</title>
    <address>
        <address>263 Tenth Street</address>
        <city>San Francisco</city>
        <state>Wisconsin</state>
        <stateCode>WI</stateCode>
        <postalCode>37657</postalCode>
        <coordinates>
            <lat>71.814525</lat>
            <lng>-161.150263</lng>
        </coordinates>
        <country>United States</country>
    </address>
</company>
<ein>977-175</ein>
<ssn>900-590-289</ssn>
<userAgent>Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36</userAgent>
<role>admin</role></dummyUser>`

export { dummyUser, extendedDummyUser, dummyUserXml }
