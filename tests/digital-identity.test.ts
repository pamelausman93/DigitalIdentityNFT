import {
  describe,
  it,
  beforeEach,
  afterEach
} from 'vitest';
import {
  Chain,
  Account,
  types,
  tx
} from '@stacks/transactions';
import {
  assertEquals,
  assertStringIncludes
} from 'chai';

const contractName = 'digital-identity';
const assetIdentifier = `${deployer.address}.${contractName}::digital-identity`;

describe('digital-identity', () => {
  let chain: Chain;
  let deployer: Account;
  let wallet1: Account;
  let wallet2: Account;
  
  beforeEach(async () => {
    chain = await Chain.fromConfig({
      epoch: 'latest'
    });
    
    deployer = chain.sessionAccounts[0];
    wallet1 = chain.sessionAccounts[1];
    wallet2 = chain.sessionAccounts[2];
    
    // Deploy the contract
    await chain.deployContract(contractName, deployer);
  });
  
  describe('create-identity', () => {
    it('successfully creates a new identity', async () => {
      const hash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const block = chain.mineBlock([
        tx.callPublicFn(
            contractName,
            'create-identity',
            [types.ascii(hash)],
            wallet1
        )
      ]);
      
      // Assert successful response
      assertEquals(block.receipts[0].result, '(ok u1)');
      
      // Verify NFT ownership
      const nftOwner = chain.callReadOnlyFn(
          contractName,
          'get-identity-data',
          [types.uint(1)],
          wallet1
      );
      
      const expectedData = {
        owner: wallet1.address,
        verified: false,
        hash: hash,
        'kyc-level': 0,
        timestamp: block.height
      };
      
      assertEquals(nftOwner.result, `(some ${JSON.stringify(expectedData)})`);
    });
    
    it('allows only one identity per user', async () => {
      const hash1 = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const hash2 = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
      
      // Create first identity
      await chain.mineBlock([
        tx.callPublicFn(
            contractName,
            'create-identity',
            [types.ascii(hash1)],
            wallet1
        )
      ]);
      
      // Attempt to create second identity
      const block = chain.mineBlock([
        tx.callPublicFn(
            contractName,
            'create-identity',
            [types.ascii(hash2)],
            wallet1
        )
      ]);
      
      // Assert error response
      assertStringIncludes(block.receipts[0].result, 'err');
    });
  });
  
  describe('update-identity-data', () => {
    it('allows owner to update identity data', async () => {
      const initialHash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const newHash = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
      
      // Create identity
      await chain.mineBlock([
        tx.callPublicFn(
            contractName,
            'create-identity',
            [types.ascii(initialHash)],
            wallet1
        )
      ]);
      
      // Update identity data
      const block = chain.mineBlock([
        tx.callPublicFn(
            contractName,
            'update-identity-data',
            [types.uint(1), types.ascii(newHash)],
            wallet1
        )
      ]);
      
      // Assert successful update
      assertEquals(block.receipts[0].result, '(ok true)');
      
      // Verify updated data
      const updatedData = chain.callReadOnlyFn(
          contractName,
          'get-identity-data',
          [types.uint(1)],
          wallet1
      );
      
      assertStringIncludes(updatedData.result, newHash);
    });
    
    it('prevents non-owner from updating identity data', async () => {
      const initialHash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const newHash = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
      
      // Create identity as wallet1
      await chain.mineBlock([
        tx.callPublicFn(
            contractName,
            'create-identity',
            [types.ascii(initialHash)],
            wallet1
        )
      ]);
      
      // Attempt update as wallet2
      const block = chain.mineBlock([
        tx.callPublicFn(
            contractName,
            'update-identity-data',
            [types.uint(1), types.ascii(newHash)],
            wallet2
        )
      ]);
      
      // Assert error response
      assertEquals(block.receipts[0].result, '(err u101)');
    });
  });
  
  describe('verify-identity', () => {
    it('allows contract owner to verify identity', async () => {
      const hash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      
      // Create identity
      await chain.mineBlock([
        tx.callPublicFn(
            contractName,
            'create-identity',
            [types.ascii(hash)],
            wallet1
        )
      ]);
      
      // Verify identity
      const block = chain.mineBlock([
        tx.callPublicFn(
            contractName,
            'verify-identity',
            [types.uint(1), types.uint(2)],
            deployer
        )
      ]);
      
      // Assert successful verification
      assertEquals(block.receipts[0].result, '(ok true)');
      
      // Check verification status
      const verificationStatus = chain.callReadOnlyFn(
          contractName,
          'is-identity-verified',
          [types.uint(1)],
          deployer
      );
      
      assertEquals(verificationStatus.result, '(ok true)');
    });
    
    it('prevents non-owner from verifying identity', async () => {
      const hash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      
      // Create identity
      await chain.mineBlock([
        tx.callPublicFn(
            contractName,
            'create-identity',
            [types.ascii(hash)],
            wallet1
        )
      ]);
      
      // Attempt verification as non-owner
      const block = chain.mineBlock([
        tx.callPublicFn(
            contractName,
            'verify-identity',
            [types.uint(1), types.uint(2)],
            wallet2
        )
      ]);
      
      // Assert error response
      assertEquals(block.receipts[0].result, '(err u100)');
    });
  });
  
  describe('read-only functions', () => {
    it('correctly retrieves identity data', async () => {
      const hash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      
      // Create identity
      const block = await chain.mineBlock([
        tx.callPublicFn(
            contractName,
            'create-identity',
            [types.ascii(hash)],
            wallet1
        )
      ]);
      
      // Get identity data
      const data = chain.callReadOnlyFn(
          contractName,
          'get-identity-data',
          [types.uint(1)],
          wallet1
      );
      
      const expectedData = {
        owner: wallet1.address,
        verified: false,
        hash: hash,
        'kyc-level': 0,
        timestamp: block.height
      };
      
      assertEquals(data.result, `(some ${JSON.stringify(expectedData)})`);
    });
    
    it('returns correct KYC level', async () => {
      const hash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const kycLevel = 2;
      
      // Create and verify identity
      await chain.mineBlock([
        tx.callPublicFn(
            contractName,
            'create-identity',
            [types.ascii(hash)],
            wallet1
        )
      ]);
      
      await chain.mineBlock([
        tx.callPublicFn(
            contractName,
            'verify-identity',
            [types.uint(1), types.uint(kycLevel)],
            deployer
        )
      ]);
      
      // Get KYC level
      const level = chain.callReadOnlyFn(
          contractName,
          'get-kyc-level',
          [types.uint(1)],
          wallet1
      );
      
      assertEquals(level.result, `(ok u${kycLevel})`);
    });
  });
});
