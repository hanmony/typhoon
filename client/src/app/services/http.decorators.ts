type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export function Http(
  method: HttpMethod,
  url: string,
  silent = false,
  keys: string[] = [],
) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (target.urls) {
      target.urls.push(url);
    } else {
      target.urls = [url];
    }

    descriptor.value = async function (...args: any[]) {
      const http = (this as any).http;
      let params: Record<string, unknown> | undefined = undefined;
      if (args.length > 0) {
        if (keys.length > 0) {
          params = {};
          for (let i = 0; i < keys.length; i++) {
            if (args[i] !== undefined) {
              params[keys[i]] = args[i];
            }
          }
        } else {
          params = args[0];
        }
      }

      let result: any;
      switch (method) {
        case 'GET':
          result = silent
            ? await http.getSilent(url, params)
            : await http.get(url, params);
          break;
        case 'POST':
          result = silent
            ? await http.postSilent(url, params)
            : await http.post(url, params);
          break;
        case 'PATCH':
          result = silent
            ? await http.patchSilent(url, params)
            : await http.patch(url, params);
          break;
        case 'PUT':
          result = silent
            ? await http.putSilent(url, params)
            : await http.put(url, params);
          break;
        case 'DELETE':
          result = silent
            ? await http.deleteSilent(url, params)
            : await http.delete(url, params);
          break;
      }

      return result;
    };
  };
}

export function Post(url: string, silent = false, keys: string[] = []) {
  return Http('POST', url, silent, keys);
}

export function Get(url: string, silent = false, keys: string[] = []) {
  return Http('GET', url, silent, keys);
}

export function Patch(url: string, silent = false, keys: string[] = []) {
  return Http('PATCH', url, silent, keys);
}

export function Put(url: string, silent = false, keys: string[] = []) {
  return Http('PUT', url, silent, keys);
}

export function Delete(url: string, silent = false, keys: string[] = []) {
  return Http('DELETE', url, silent, keys);
}

export function requestDone(...params: unknown[]): never {
  throw new Error('requestDone: ' + params);
}
