export default async function handler(req, res) {
  // Clear admin cookie
  res.setHeader('Set-Cookie', `admin_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
  return res.status(200).json({ ok: true });
}
