import { StacksMainnet, StacksTestnet } from '@stacks/network';
import { 
  callReadOnlyFunction, 
  cvToJSON, 
  principalCV, 
  uintCV, 
  someCV, 
  noneCV, 
  stringUtf8CV, 
  boolCV,
  ReadOnlyFunctionOptions 
} from '@stacks/transactions';

const network = process.env.NEXT_PUBLIC_NETWORK === 'mainnet' 
  ? new StacksMainnet() 
  : new StacksTestnet();

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const contractName = (process.env.NEXT_PUBLIC_CONTRACT_NAME || 'deadlock').replace(/-clar|\.clar$/g, '');

export const getNetwork = () => network;

function cleanCV(obj: any): any {
  if (obj === null || obj === undefined) return null;
  
  if (typeof obj === 'object') {
    if ('type' in obj && obj.type && typeof obj.type === 'string' && obj.type.startsWith('(optional')) {
      if (obj.value === null || obj.value === undefined || obj.value === 'none') {
        return null;
      }
      return cleanCV(obj.value);
    }
    
    if ('type' in obj && obj.type && typeof obj.type === 'string' && obj.type.startsWith('(tuple')) {
      const tupleObj: any = {};
      for (const [k, v] of Object.entries(obj.value)) {
        const cleanedKey = k.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        const cleanedVal = cleanCV(v);
        tupleObj[k] = cleanedVal;
        tupleObj[cleanedKey] = cleanedVal;
      }
      return tupleObj;
    }
    
    if ('type' in obj && 'value' in obj) {
      if (obj.type === 'uint' || obj.type === 'int') {
        return Number(obj.value);
      }
      if (obj.type === 'bool') {
        return obj.value === true || obj.value === 'true';
      }
      if (obj.type === 'principal') {
        return obj.value;
      }
      if (obj.type && (obj.type.startsWith('string') || obj.type.startsWith('(string'))) {
        return obj.value;
      }
      return cleanCV(obj.value);
    }
    
    const newObj: any = {};
    for (const [k, v] of Object.entries(obj)) {
      const cleanedKey = k.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      const cleanedVal = cleanCV(v);
      newObj[k] = cleanedVal;
      newObj[cleanedKey] = cleanedVal;
    }
    return newObj;
  }
  
  return obj;
}

export async function getVowCount(): Promise<number> {
  const options: ReadOnlyFunctionOptions = {
    contractAddress,
    contractName,
    functionName: 'get-vow-count',
    functionArgs: [],
    network,
    senderAddress: contractAddress,
  };

  const result = await callReadOnlyFunction(options);
  return Number(cleanCV(cvToJSON(result)));
}

export async function getVow(vowId: number) {
  const options: ReadOnlyFunctionOptions = {
    contractAddress,
    contractName,
    functionName: 'get-vow',
    functionArgs: [uintCV(vowId.toString())],
    network,
    senderAddress: contractAddress,
  };

  const result = await callReadOnlyFunction(options);
  return cleanCV(cvToJSON(result));
}

export async function getSpectatorPool(vowId: number) {
  const options: ReadOnlyFunctionOptions = {
    contractAddress,
    contractName,
    functionName: 'get-spectator-pool',
    functionArgs: [uintCV(vowId.toString())],
    network,
    senderAddress: contractAddress,
  };

  const result = await callReadOnlyFunction(options);
  return cleanCV(cvToJSON(result));
}

export const contractDetails = {
  address: contractAddress,
  name: contractName,
};
