import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';
import { 
  fetchCallReadOnlyFunction, 
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
  ? STACKS_MAINNET 
  : STACKS_TESTNET;

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const contractName = process.env.NEXT_PUBLIC_CONTRACT_NAME!;

export const getNetwork = () => network;

export async function getVowCount(): Promise<number> {
  const options: ReadOnlyFunctionOptions = {
    contractAddress,
    contractName,
    functionName: 'get-vow-count',
    functionArgs: [],
    network,
    senderAddress: contractAddress,
  };

  const result = await fetchCallReadOnlyFunction(options);
  return Number(cvToJSON(result).value);
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

  const result = await fetchCallReadOnlyFunction(options);
  const json = cvToJSON(result);
  if (!json.value) return null;
  
  return json.value;
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

  const result = await fetchCallReadOnlyFunction(options);
  return cvToJSON(result).value;
}

export const contractDetails = {
  address: contractAddress,
  name: contractName,
};
