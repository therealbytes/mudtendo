package main

import (
	"context"
	"fmt"
	"io/ioutil"
	"log"
	"math/big"
	"os"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/concrete/api"
	api_test "github.com/ethereum/go-ethereum/concrete/api/test"
	"github.com/ethereum/go-ethereum/concrete/precompiles"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

var (
	RpcUrl        = "http://localhost:9545"
	GasLimit      = uint64(10_000_000)
	GasPrice      = big.NewInt(1_000_000_000)
	PrivateKeyHex = "dbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97"
	ChainID       = big.NewInt(901)
)

func waitForTransaction(client *ethclient.Client, txHash common.Hash) (*types.Receipt, error) {
	// Create a ticker to check the transaction status at regular intervals
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			// Get the transaction receipt
			receipt, err := client.TransactionReceipt(context.Background(), txHash)
			if err != nil {
				if err.Error() == ethereum.NotFound.Error() {
					// Transaction is still pending
					continue
				}
				return nil, err
			}

			// Check if the transaction has been included in a block
			if receipt != nil {
				return receipt, nil
			}
		}
	}
}

func main() {
	// Check if a command line argument is provided
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run upload.go <file-path>")
		return
	}

	// Parse the private key
	privateKey, err := crypto.HexToECDSA(PrivateKeyHex)
	if err != nil {
		panic(err)
	}
	fromAddress := crypto.PubkeyToAddress(privateKey.PublicKey)

	// Get the file path from the command line argument
	filePath := os.Args[1]

	// Read the file contents
	preimage, err := ioutil.ReadFile(filePath)
	if err != nil {
		fmt.Printf("Error reading file: %s\n", err.Error())
		return
	}

	// Create a new API instance
	API := api.New(api_test.NewMockEVM(api_test.NewMockStateDB()), common.Address{})
	store := api.NewPersistentBigPreimageStore(API, precompiles.BigPreimageStoreRadix, precompiles.BigPreimageStoreLeafSize)

	// Add the preimage to the store
	hash := store.AddPreimage(preimage)

	fmt.Println("Preimage hash:", hash.Hex())

	// Get the ABI for the registry
	ABI := precompiles.BigPreimageRegistry.ABI

	// Create an Ethereum client
	client, err := ethclient.Dial(RpcUrl)
	if err != nil {
		log.Fatal(err)
	}

	// Prepare the input data for the transaction
	input, err := ABI.Pack("addPreimage", preimage)
	if err != nil {
		log.Fatal(err)
	}

	// precompiles.BigPreimageRegistry.SetConfig(precompiles.PreimageRegistryConfig{
	// 	Enabled:  true,
	// 	Writable: true,
	// })
	// output, err := precompiles.BigPreimageRegistry.Run(API, input)
	// if err != nil {
	// 	log.Fatal(err)
	// }
	// retHash := common.BytesToHash(output)
	// fmt.Println("Preimage hash:", retHash.Hex())

	// Get the nonce for the sender account
	nonce, err := client.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		log.Fatal(err)
	}

	// Create the transaction
	transaction := types.NewTransaction(nonce, api.BigPreimageRegistryAddress, common.Big0, GasLimit, GasPrice, input)

	// Sign the transaction
	signedTransaction, err := types.SignTx(transaction, types.NewEIP155Signer(ChainID), privateKey)
	if err != nil {
		log.Fatal(err)
	}

	// Send the signed transaction
	err = client.SendTransaction(context.Background(), signedTransaction)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Transaction hash:", signedTransaction.Hash().Hex())
	fmt.Println("Waiting for receipt...")

	// Wait for the transaction to be included in a block
	receipt, err := waitForTransaction(client, signedTransaction.Hash())
	if err != nil {
		log.Fatal(err)
	}

	// Check if the transaction was successful
	if receipt.Status == types.ReceiptStatusSuccessful {
		fmt.Println("Transaction successful.")
	} else {
		log.Fatal("Transaction failed.")
	}
}
