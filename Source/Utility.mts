
export function has<S extends PropertyKey>(property: S)
{
	return function (obj: unknown): obj is Record<S, unknown>
	{
		return Is.object(obj) && Reflect.has(obj, property);
	};
}

export const Property =
	<P extends string>
		(property: P, ..._: Variadic) =>
		<O extends { [key in P]: O[key & keyof O]; }>
			(data: O) =>
		{
			return data[property];
		};


function success<T>(result: unknown): result is Success<T>
{
	return has("success")(result);
};

const options =
{
	object: (data: unknown): data is { [Property: PropertyKey]: unknown; } =>
		(typeof data === "object" || typeof data === "function")
		&& !(data === null),	//	Technically, null is an object in JS but I don't find it very useful here.

	JSON: (data: unknown): data is Json => // Clean this implementation
	{
		const { parse, stringify } = JSON;

		try
		{
			const parsed = parse(stringify(data));
			return options.object(parsed);	//	Do deep compare
		}
		catch (err)
		{
			return false;
		}
	},

	defined: <T,>(data: T): data is NonNullable<T> => (data !== undefined && data !== null),
	nothing: (data: unknown): data is Nothing => (data === undefined || data === null),
	function: (data: unknown): data is λ => typeof data === "function",
	boolean: (data: unknown): data is boolean => Type(data) === "boolean",
	number: (data: unknown): data is number => Type(data) === "number" && data !== NaN,
	symbol: (data: unknown): data is symbol => Type(data) === "symbol",
	bigint: (data: unknown): data is bigint => Type(data) === "bigint",
	string: (data: unknown): data is string => Type(data) === "string",
	null: (data: unknown): data is null => (data === null),
	true: (data: unknown): data is true => data === true,
	array: Array.isArray,
	frozen: <T,>(data: T): data is Readonly<T> => Object.isFrozen(data),
	asyncIterator: <T,>(data: unknown): data is AsyncIterableIterator<T> => options.object(data) && options.function(data[Symbol.asyncIterator]),
	equal: <T,>(data: T) => (value: unknown): value is T => data === value,
	promise: (data: unknown): data is Promise<unknown> => data instanceof Promise,
	get success()
	{
		return success;
	},

	get not()	//	Lets be more elegant here. We should either proxy the 'is' to invert all returns or create a copy or something.
	{
		const inverse =
		{
			object: (data: unknown): data is Primitive => !options.object(data),
			defined: (data: any): data is Nothing => !options.defined(data),
			string: <T,>(data: T): data is T extends string ? never : T => Type(data) !== "string",
		};

		return inverse;
	}
};


function Is(data: unknown)
{
	const handler: ProxyHandler<typeof options> =
	{
		get(target: typeof options, property: string | symbol, receiver: any)
		{
			const value = Reflect.get(target, property, receiver);
			return value(data);
		}
	};

	return new Proxy(options, handler);
}
function Type<T>(data: T)
{
	return typeof data;
}

const handler: ProxyHandler<typeof Is> =
{
	get(target: typeof Is, property: string | symbol, receiver: any)
	{
		return Reflect.get(target, property, receiver);
	}
};

type isser = (typeof Is & typeof options);

const merged: isser = Object.assign(Is, options);

export const is = new Proxy<isser>(merged, handler);
