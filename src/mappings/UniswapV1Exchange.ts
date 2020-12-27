import { OToken, Trade } from '../types/schema'
import { EthPurchase, TokenPurchase, UniswapV1Exchange } from '../types/templates/UniswapV1Exchange/UniswapV1Exchange'
import { BigIntOne, getCreateEth, isOToken } from '../utils'
import { getCreateOpynFactory } from './OpynFactory'

// ================================================================
// Trades
// ================================================================
export function handleEthPurchase(event: EthPurchase): void {
  let exchange = UniswapV1Exchange.bind(event.address)
  let oTokenAddr = exchange.tokenAddress().toHexString().toString()

  // Make sure exchange token is an oToken
  if (!isOToken(oTokenAddr)) {
    return
  }
  
  let oToken = OToken.load(oTokenAddr)

  // Create new trade
  let trade = new Trade(oToken.id + oToken.numTrades.toString())
  trade.blockNumber = event.block.number
  trade.timestamp = event.block.timestamp
  trade.amount = event.params.tokens_sold
  trade.premium = event.params.eth_bought
  trade.baseAsset = getCreateEth().id
  trade.type = "SELL"
  trade.save()

  // Update oToken
  oToken.numTrades = oToken.numTrades + BigIntOne
  let trades = oToken.trades
  trades.push(trade.id)
  oToken.trades = trades
  oToken.latestTrade = trade.id
  oToken.save()

  // Update Opyn
  let opynFactory = getCreateOpynFactory()
  opynFactory.totalTradeVolume = opynFactory.totalTradeVolume + trade.premium
  opynFactory.save()
}

export function handleTokenPurchase(event: TokenPurchase): void {
  let exchange = UniswapV1Exchange.bind(event.address)
  let oTokenAddr = exchange.tokenAddress().toHexString().toString()

  // Make sure exchange token is an oToken
  if (!isOToken(oTokenAddr)) {
    return
  }
  
  let oToken = OToken.load(oTokenAddr)

  // Create new trade
  let trade = new Trade(oToken.id + oToken.numTrades.toString())
  trade.blockNumber = event.block.number
  trade.timestamp = event.block.timestamp
  trade.amount = event.params.tokens_bought
  trade.premium = event.params.eth_sold
  trade.baseAsset = getCreateEth().id
  trade.type = "BUY"
  trade.save()

  // Update oToken
  oToken.numTrades = oToken.numTrades + BigIntOne
  let trades = oToken.trades
  trades.push(trade.id)
  oToken.trades = trades
  oToken.latestTrade = trade.id
  oToken.save()

  // Update Opyn
  let opynFactory = getCreateOpynFactory()
  opynFactory.totalTradeVolume = opynFactory.totalTradeVolume + trade.premium
  opynFactory.save()
}