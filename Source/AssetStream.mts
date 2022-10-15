import { has, is, Property } from "./Utility.mjs";
import XRPL from "xrpl";

const { Client, Wallet: XRPL_Wallet, getBalanceChanges } = XRPL;

type TokenﾠStats =
	{
		price: { low: number, high: number, current: number; };
		fee: number;
		transactions: number;
	};

const tokens = new Map<string, Set<string>>();


type Token =
	{
		currency: string;
		issuer: string;
	};

export default async function AssetStream(server = "wss://xrplcluster.com/")
{
	const client = new Client(server, { maxFeeXRP: "0.000020" });
	await client.connect();

	async function Price(token: Token)
	{
		const { currency, issuer } = token;
		const request =
		{
			command: "book_offers",
			// taker: "r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59",
			taker_gets:
			{
				currency: "XRP"
			},
			taker_pays: { currency, issuer },
			limit: 1,
			ledger: "validated"
		};

		const response = await client.request(request);
		if (!is.defined(response.result.offers[0]))
		{
			return 0;
		}
		const { TakerGets, TakerPays } = response.result.offers[0];
		const price = parseFloat(TakerPays.value) / (parseFloat(TakerGets) / 1_000_000);
		return price;
	}


	function Wallet(account: string, secret: string = "")
	{
		const ledger_index = "validated";
		const strict = true;
		function Request(command: string)
		{
			const request = { command, strict, ledger_index, account };
			return () => client.request(request);
		}

		const AccountﾠInformation = Request("account_info");
		const AccountﾠLines = Request("account_lines");

		async function Balance()
		{
			const drops = await AccountﾠInformation()
				.then(function (response)
				{
					const result = response.result as { account_data: { Balance: string; }; };
					return { XRP: parseFloat(result.account_data.Balance) / 1_000_000 };
				});

			const trustlines =
				await AccountﾠLines()
					.then(function (response)
					{
						const result = response.result as { lines: { account: string; balance: string, currency: string, quality_in: number, quality_out: number; }[]; };
						return result.lines
							.map(function (line)
							{
								const { balance, account, currency, quality_in, quality_out } = line;
								return { currency, account, balance };
							})
							.reduce(function (lines: { [p: string]: { account: string, balance: string; }; }, line)
							{
								const currencies = lines[line.currency] ?? {};

								const merged = Object.assign(currencies, { [line.account]: parseFloat(line.balance) });

								return Object.assign(lines, { [line.currency]: merged });
							}, {});
					});

			return Object.assign(drops, trustlines);
		}

		async function Pay(payment: { address: string, amount: number; })
		{
			const wallet = XRPL_Wallet.fromSecret(secret);

			const { address, amount } = payment;
			const request =
				{
					TransactionType: "Payment",
					Account: account,
					Amount: XRPL.xrpToDrops(amount.toFixed(6)),
					Destination: address,
				} as const;


			const prepared = await client.autofill(request);
			const max_ledger = prepared.LastLedgerSequence;

			// console.log("Prepared transaction instructions:", prepared);
			// console.log("Transaction cost:", dropsToXrp(prepared.Fee), "XRP");
			// console.log("Transaction expires after ledger:", max_ledger);

			const signed = wallet.sign(prepared);


			// console.log("Identifying hash:", signed.hash);
			// console.log("Signed blob:", signed.tx_blob);

			return client.submitAndWait(signed.tx_blob)
				.then(function (tx)
				{
					console.log(tx);
					console.log("Transaction result:", tx.result.meta.TransactionResult);
					console.log("Balance changes:", JSON.stringify(getBalanceChanges(tx.result.meta), null, 2));
				})
				.catch(function (err)
				{
					console.log("Error", err);
				});


		}

		return { Balance, Pay, address: account, AccountﾠInformation };
	}

	const account_lines =
	{
		command: "subscribe",
		strict: true,
		ledger_index: "validated",
		streams: ["transactions"]
	};

	await client.request(account_lines);

	client.on("transaction", function (message)
	{
		if (message.engine_result !== "tesSUCCESS" || message.validated !== true)
		{
			return;
		}

		const meta = message.meta;

		if (meta.TransactionResult !== "tesSUCCESS")
		{
			return;
		}

		meta.AffectedNodes
			.filter(function (node)
			{
				return has("CreatedNode")(node);
			})
			.map(Property("CreatedNode"))
			.filter(function (createdNode)
			{
				return createdNode.LedgerEntryType === "Offer";
			})
			.map(Property("NewFields"))
			.map(function (offer)
			{
				const { TakerGets, TakerPays } = offer;
				if (is.string(TakerGets))
				{
					const xrp = parseFloat(TakerGets) / 1000000;
					const { currency, issuer, value } = TakerPays;
					const token = parseFloat(value);
					const price = token / xrp;
					//console.log(`Buying ${token} ${currency} (${issuer}) for ${xrp} @ ${price}`);

					const tokenIssuers: Set<string> = tokens.has(currency)
						? tokens.get(currency)
						: new Set();

					tokenIssuers.add(issuer);
					tokens.set(currency, tokenIssuers);
				}
				else if (is.string(TakerPays))
				{
					const { currency, issuer, value } = TakerGets;
					const xrp = parseFloat(TakerPays) / 1000000;
					const token = parseFloat(value);
					const price = token / xrp;

					//console.log(`Selling ${token} ${currency} (${issuer}) for ${xrp} @ ${price}`);

					// const tokenIssuers: Set<string> = tokens.has(currency)
					// 	? tokens.get(currency)
					// 	: new Set();

					// tokenIssuers.add(issuer);
					// tokens.set(currency, tokenIssuers);
				}
				else
				{
					console.log("Token for token");
				}


			});


	});


	return { Wallet, tokens, Price };
}