import { BigInt, BigDecimal, Address } from '@graphprotocol/graph-ts'
import { getCreateOpynFactory } from './mappings/OpynFactory'
import { Asset, OToken } from './types/schema'
import { ERC20 } from './types/templates/ERC20/ERC20'

export const BigIntZero =  BigInt.fromI32(0)
export const BigIntOne =  BigInt.fromI32(1)
export const BigDecimalZero = BigDecimal.fromString('0')
export const BigDecimalOne = BigDecimal.fromString('1')

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
export const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"

export function isOToken(address: string): boolean {
  let oToken = OToken.load(address)
  return oToken != null
}

export function getCreateEth(): Asset {
  // Returns the ETH asset. The entity is created if it does not exist yet
  let eth = Asset.load(ETH_ADDRESS)
  if (eth == null) {
    eth = new Asset(ETH_ADDRESS)
    eth.symbol = "ETH"
    eth.name = "Ether"
    eth.decimals = 18
    eth.save()

    // Update ACOFactory
    let opynFactory = getCreateOpynFactory()
    let assets = opynFactory.assets
    assets.push(eth.id)
    opynFactory.assets = assets
    opynFactory.numAssets = opynFactory.numAssets + BigIntOne
    opynFactory.save()
  }

  return eth as Asset
}

export function getCreateAsset(address: string): Asset {
  let asset = Asset.load(address)
  if (asset == null) {
    asset = new Asset(address)

    let contract = ERC20.bind(Address.fromString(address))
    asset.symbol = contract.symbol()
    asset.name = contract.name()
    asset.decimals = contract.decimals()
    asset.save()

    // Update ACOFactory
    let opynFactory = getCreateOpynFactory()
    let assets = opynFactory.assets
    assets.push(asset.id)
    opynFactory.assets = assets
    opynFactory.numAssets = opynFactory.numAssets + BigIntOne
    opynFactory.save()
  }

  return asset as Asset
}