# Test using foundry

Command line testing using foundry's create, send and call commands.

## Setup variables.

```sh
#RPC URL
export RPC=""

#Private Key of the deployer
export PK=""

#Deployer address
export DPLYR=""

#Test address -optional-
export TST=""
```

## Deployments
Deploy source token.
```sh
forge create --rpc-url $RPC --private-key $PK contracts/BeamToken.sol:BeamToken --constructor-args "Source" "SRC"
```

Assign the address.
```sh
export SRC=""
```

Deploy destination token.
```sh
forge create --rpc-url $RPC --private-key $PK contracts/BeamToken.sol:BeamToken --constructor-args "Destination" "DST"
```

Assign the address.
```sh
export DST=""
```

Deploy the Migrator contract.
```sh
forge create --rpc-url $RPC --private-key $PK contracts/Migrator.sol:Migrator --constructor-args $SRC $DST 100ether
```

Assign the address.
```sh
export MGTR=""
```

## Fetch and grant roles
```sh
cast call --rpc-url $RPC $SRC "MINTER_ROLE()"
```

```sh
export MINTR=""
```

```sh
cast call --rpc-url $RPC $SRC "BURNER_ROLE()"
```

```sh
export BURNR=""
```

Grant role to the deployer -can use another test address optionally-
```sh
cast send --rpc-url $RPC --private-key $PK $SRC "grantRole(bytes32,address)" $MINTR $DPLYR
```

Grant migrator with source token burner role
```sh
cast send --rpc-url $RPC --private-key $PK $SRC "grantRole(bytes32,address)" $BURNR $MGTR
```

Grant migrator with destination token minter role
```sh
cast send --rpc-url $RPC --private-key $PK $DST "grantRole(bytes32,address)" $MINTR $MGTR
```

## Token minting

```sh
cast send --rpc-url $RPC --private-key $PK $SRC "mint(address,uint256)" $DPLYR 10000ether
```


## Migration
Check balance before migrating
```sh
cast call --rpc-url $RPC $SRC "balanceOf(address)" $DPLYR
```

```sh
cast call --rpc-url $RPC $DST "balanceOf(address)" $DPLYR
```

Migrate
```sh
cast send --rpc-url $RPC --private-key $PK $MGTR "migrate(uint256)" 50ether
```

Check balance after migrating
```sh
cast call --rpc-url $RPC $SRC "balanceOf(address)" $DPLYR
```

```sh
cast call --rpc-url $RPC $DST "balanceOf(address)" $DPLYR
```

## Results

After successfully migrating the tokens, the user should have 9950 SRC tokens and 5000 (50*100) DST tokens.