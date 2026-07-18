const LOCAL_GATEWAY_HEADER = "x-vg-local-gateway";
const HEX_256 = /^[a-f0-9]{64}$/;

type HeaderReader = {
  get(name: string): string | null;
};

export function hasValidLocalGateway(
  headers: HeaderReader,
  environment: Readonly<Record<string, string | undefined>>,
): boolean {
  const expected = environment.VG_LOCAL_UPSTREAM_SECRET;
  const received = headers.get(LOCAL_GATEWAY_HEADER);
  if (!expected || !received || !HEX_256.test(expected) || !HEX_256.test(received)) return false;

  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ received.charCodeAt(index);
  }
  return difference === 0;
}
