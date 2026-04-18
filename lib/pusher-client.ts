import PusherClient from "pusher-js";

// @ts-ignore
export const pusherClient = typeof window !== "undefined" ?
  new PusherClient(
    process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
    {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    }
  ) : null as any;
