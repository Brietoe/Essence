import AssetStream from "./AssetStream.mjs";
import { is } from "./Utility.mjs";

const { Wallet, tokens, Price } = await AssetStream();


const essence = Wallet("rEScsNf3tCkErq9vf7mGbfMugK9asVGDDz");
essence;

const jump = Wallet("rJUMP7mXvmj9VrG7bcPwUDmZ2VEcrwKFKi", "secret");
const jumpBalance = await jump.Balance();

const rage = Wallet("rage6XNumNxjbzhxDKouvKHVx6zxkWJ3gL");


const jumpXRP = jumpBalance.XRP;
const overflowXRP = jumpXRP - 100;

//	Send excess XRP (over 100) from selling ESN to trading account
if (overflowXRP > 0)
{
	const address = rage.address;
	const amount = overflowXRP;
	jump.Pay({ address, amount });
}


setInterval(function ()
{
	console.log(" ");
	console.log("Recalculating...");
	console.log(" ");

	tokens.forEach(function (issuers, currency)
	{
		console.log(currency, issuers.size);
		issuers.forEach(function (issuer)
		{
			Price({ currency, issuer })
				.then(function (price)
				{
					if (price > 0.000010)
					{
						const issuerWallet = Wallet(issuer);
						issuerWallet.AccountﾠInformation().then(function (response)
						{
							if (is.defined(response.result.account_data.TransferRate))
							{
								console.log(currency, issuer, price, ((response.result.account_data.TransferRate - 1_000_000_000) / 1_000_000_000) * 100, "%");
							}
							else
							{
								console.log(currency, issuer, price);
							}
						});
					}

				});
		});
	});

	const total = Array.from(tokens.entries())
		.reduce(function (previous, current)
		{
			return previous + current[1].size;
		}, 0);

	console.log(total);

}, 20000);
