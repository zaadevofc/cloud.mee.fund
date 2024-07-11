import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { Hono } from "https://deno.land/x/hono@v4.3.11/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { bearerAuth } from 'npm:hono/bearer-auth';
import { verify } from "npm:hono/jwt";

const env = await load();
const app = new Hono()

const stringObj = (obj: unknown) => JSON.stringify(obj, null, 2)
const parseObj = (obj: string) => JSON.parse(stringObj(JSON.parse(obj)))
const getRandom = (items: Array<any>) => items[~~(items.length * Math.random())];

const exclude = (obj: any, keys: string[]) => {
  const result: any = {}
  for (const key in obj) {
    if (!keys.includes(key)) result[key] = obj[key]
  }
  return result
}

const verifyJWT = async (token: string): Promise<{ [k: string]: unknown } | false> => {
  try {
    const result = await verify(token, env['JWT_TOKEN']!, "HS512")
    return exclude(result, ['exp'])
  } catch (e) {
    console.error(e)
    return false
  }
}

const SUPABASE_API = [
  parseObj(env['SUPABASE_API_1']!),
  parseObj(env['SUPABASE_API_2']!),
  parseObj(env['SUPABASE_API_3']!),
]

const randomStr = (length: number) => {
  let result = '';
  const char = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result += char.charAt(Math.floor(Math.random() * char.length));
  }
  return result;
}

app.use("*", bearerAuth({
  async verifyToken(token) {
    const secret = env['SECRET']!
    const res = await verifyJWT(token);
    if (res) return res?.secret == secret;
    return false;
  },
}))

app.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const { bucket } = c.req.query()
  const file = body['file'] as File

  if (!file) return c.json({ error: 'Tidak ada file yang di upload!' }, 400)

  const API = getRandom(SUPABASE_API)
  const supabase = createClient(API[0], API[1])

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(randomStr(12), file)
  console.log("🚀 ~ app.post ~ data:", data)

  if (error) return c.json({ error: error.message }, 400)

  return c.json({
    data: {
      url: `${API[0]}storage/v1/object/public/${data.fullPath}`
    }
  })
})

export default app