import { getContactsApi, supportsContactImport } from '../src/utils/deviceCapabilities';
import { assertEqual, runTest } from './helpers';

runTest('contact import is supported when contacts.select exists', () => {
  const navigatorLike = {
    contacts: {
      select: async () => [],
    },
  } as unknown as Navigator;

  assertEqual(supportsContactImport(navigatorLike), true, 'Expected contacts API support to be detected');
  assertEqual(typeof getContactsApi(navigatorLike)?.select, 'function', 'Expected contacts API getter to expose select');
});

runTest('contact import is unsupported when contacts API is missing', () => {
  const navigatorLike = {} as unknown as Navigator;

  assertEqual(supportsContactImport(navigatorLike), false, 'Expected missing contacts API to be reported as unsupported');
  assertEqual(getContactsApi(navigatorLike), null, 'Expected missing contacts API getter to return null');
});
