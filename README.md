# Essence
XRPL Essence Liquidity Token

This implementation shows how XRPL DEX orderbook information is harvested.
The results are printed and updated to console every 20 seconds.
Currently, this software filters for tokens where:
Price > 0.000010 XRP and Buy orders for XRP exist.

It prints the token, issuer, price and transaction fee.

This implementation also sends excess XRP made from selling off ESN to the actively trading hot wallet.


A simplified version of the trading algorithm exists on my Github project "CryptoCowboy"
The CryptoCowboy implementation is fully funtioning and actively trades on the live mainet.
I might post the full implementation code for "CryptoCowboy" later - I will update here if I do.