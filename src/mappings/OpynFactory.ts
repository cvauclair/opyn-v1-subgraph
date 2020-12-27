import { OptionsContractCreated } from '../types/OpynFactory/OpynFactory'
import { OpynFactory, Asset, OToken } from '../types/schema'
import { BigDecimalOne, BigIntZero, getCreateAsset, getCreateEth, ZERO_ADDRESS } from '../utils'
import { OToken as OTokenContract } from '../types/OpynFactory/OToken'
import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts'

const OPYN_FACTORY_ADDRESS = "0xcC5d905b9c2c8C9329Eb4e25dc086369D6C7777C"

function calculateOTokenStrike(base: BigInt, exp: i32, oTokenDecimals: i32, strikeAssetDecimals: i32, isPut: boolean): BigDecimal {
  let ten = BigInt.fromI32(10)
  let m_o = ten.pow(oTokenDecimals as u8).toBigDecimal()
  let m_s = ten.pow(strikeAssetDecimals as u8).toBigDecimal()

  let m_exp: BigDecimal
  if (exp < 0) {
    m_exp = BigDecimalOne / ten.pow((exp * -1) as u8).toBigDecimal()
  } else {
    m_exp = ten.pow(exp as u8).toBigDecimal()
  }

  let raw_strike = base.toBigDecimal() * m_exp * m_o * m_s
  return isPut ? raw_strike / m_s : m_s / raw_strike
}

export function getCreateOpynFactory(): OpynFactory {
  let opynFactory = OpynFactory.load(OPYN_FACTORY_ADDRESS)
  if (opynFactory == null) {
    opynFactory = new OpynFactory(OPYN_FACTORY_ADDRESS)
    opynFactory.numOptions = BigIntZero
    opynFactory.options = []
    opynFactory.numAssets = BigIntZero
    opynFactory.assets = []
    opynFactory.totalTradeVolume = BigIntZero
    opynFactory.save()
  }

  return opynFactory as OpynFactory
}

export function handleNewOption(event: OptionsContractCreated): void {
  let oTokenAddr = event.params.addr.toHexString().toString()
  let contract = OTokenContract.bind(Address.fromString(oTokenAddr))

  // Create new OToken entity
  let oToken = new OToken(oTokenAddr)
  oToken.creationBlock = event.block.number
  oToken.creationTimestamp = event.block.timestamp
  
  // Get decimals
  let exchange_rate_result = contract.oTokenExchangeRate()
  oToken.decimals = exchange_rate_result.value1 * -1

  // Get expiration
  oToken.expiration = contract.expiry()

  // Get Option type
  let option_type = "PUT"
  if (contract.name().includes("Call")) {
    option_type = "CALL"
  }
  oToken.type = option_type

  // Get strike and underlying asset addresses
  let strikeAssetAddr = ""
  let underlyingAssetAddr = ""
  if (option_type == "PUT") {
    strikeAssetAddr = contract.collateral().toHexString().toString()
    underlyingAssetAddr = contract.underlying().toHexString().toString()
  } else {
    strikeAssetAddr = contract.underlying().toHexString().toString()
    underlyingAssetAddr = contract.collateral().toHexString().toString()
  }
  oToken.strikeAsset = strikeAssetAddr
  oToken.underlying = underlyingAssetAddr

  // Get strike and underlying assets (Opyn uses the ZERO_ADDRESS to indicate ETH)
  let strikeAsset: Asset
  if (strikeAssetAddr == ZERO_ADDRESS) {
    strikeAsset = getCreateEth()
  } else {
    strikeAsset = getCreateAsset(strikeAssetAddr)
  }
  let underlying: Asset
  if (underlyingAssetAddr == ZERO_ADDRESS) {
    underlying = getCreateEth()
  } else {
    underlying = getCreateAsset(underlyingAssetAddr)
  }

  oToken.underlying = underlying.id
  oToken.strikeAsset = strikeAsset.id

  // Calculate strike price
  let strikePriceResult = contract.strikePrice()
  let base = strikePriceResult.value0
  let exp = strikePriceResult.value1

  oToken.strike = calculateOTokenStrike(base, exp, oToken.decimals, strikeAsset.decimals, option_type == "PUT")

  oToken.numTrades = BigIntZero
  oToken.trades = []

  oToken.save()
}