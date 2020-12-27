import { NewExchange } from '../types/UniswapV1Factory/UniswapV1Factory'
import { UniswapV1Exchange } from '../types/templates'
import { isOToken } from '../utils'

// Register Uniswap exchange for event monitoring if its token is an oToken
export function handleNewExchange(event: NewExchange): void {
  let token_addr = event.params.token.toHexString().toString()
  
  if (isOToken(token_addr)) {
    UniswapV1Exchange.create(event.params.exchange)
  }
}
