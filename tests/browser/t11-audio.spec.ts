import { expect, test, type Page } from "@playwright/test";
import { mockEmptyDashboard } from "./fixtures";

// Real PCM tone encoded entirely in test setup. Interception leaves all owner
// MP3 files untouched; the browser decodes and plays media rather than a mock.
function tone() {
  const rate = 8000;
  const samples = rate * 2;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36);
  wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) wav.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 440 / rate) * 1000), 44 + i * 2);
  return wav;
}
const player = (page: Page) => page.getByRole("region", { name: "Edition music" });
const state = (page: Page) => page.locator('audio').evaluate((audio: HTMLAudioElement) => ({
  src: new URL(audio.src).pathname, volume: audio.volume, paused: audio.paused,
  loop: audio.loop, duration: audio.duration, time: audio.currentTime,
}));
async function start(page: Page) {
  const panel = player(page);
  await expect(panel.getByRole("status")).toHaveText(/Playing|Select Play music/);
  if (await panel.getByRole("button", { name: "Play music", exact: true }).count()) {
    await panel.getByRole("button", { name: "Play music", exact: true }).click();
  }
  await expect(panel.getByRole("status")).toContainText("Playing");
}
async function choose(page: Page, current: string, next: string) {
  const select = page.getByLabel("Current edition", { exact: true });
  await expect(select.locator('option:checked')).toContainText(current);
  const value = await select.locator('option').filter({ hasText: next }).first().getAttribute('value');
  expect(value).not.toBeNull();
  await select.selectOption(value!);
}
async function visibility(page: Page, hidden: boolean) {
  // Deterministic visibility event: media itself stays native. Real tab-switch
  // smoke coverage is still required by the coordinator's integration gate.
  await page.evaluate(hidden => {
    Object.defineProperty(document, "hidden", { configurable: true, value: hidden });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

test.beforeEach(async ({ page }) => {
  await mockEmptyDashboard(page);
  await page.route(/\/audio\/fifa2[2-7]\.mp3(?:\?.*)?$/, route => route.fulfill({ contentType: "audio/wav", body: tone() }));
});

test("T11: native audio loops, uses actual duration and persists volume and deliberate pause", async ({ page }) => {
  await page.goto("/");
  await start(page);
  await expect.poll(async () => (await state(page)).volume).toBe(.15);
  expect(await state(page)).toMatchObject({ src: "/audio/fifa27.mp3", loop: true, paused: false, duration: 2 });
  await expect(player(page).getByRole("status")).toContainText("0:02");
  // Observe a real wrap instead of only checking the loop attribute.
  await expect.poll(async () => (await state(page)).time).toBeGreaterThan(1.5);
  await expect.poll(async () => (await state(page)).time).toBeLessThan(.8);
  const slider = player(page).getByRole("slider", { name: "Music volume" });
  await slider.fill("47");
  await player(page).getByRole("button", { name: "Pause music" }).click();
  await choose(page, "EA SPORTS FC 27", "FIFA 22");
  await expect.poll(async () => (await state(page)).src).toBe("/audio/fifa22.mp3");
  expect(await state(page)).toMatchObject({ volume: .47, paused: true });
  await page.reload();
  await expect(player(page).getByRole("status")).toContainText("Paused");
  expect(await state(page)).toMatchObject({ volume: .47, paused: true });
  await expect(player(page).getByRole("slider")).toHaveValue("47");
  await player(page).getByRole("button", { name: "Play music" }).focus();
  await page.keyboard.press("Enter");
  await expect(player(page).getByRole("status")).toContainText("Playing");
  const box = await player(page).boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await expect(player(page).getByRole("button", { name: /skip|next|shuffle/i })).toHaveCount(0);
});

test("T11: every edition selects its exact URL, fades through silence and ALL retains the song", async ({ page }) => {
  await page.goto("/");
  await start(page);
  await page.locator("audio").evaluate((audio: HTMLAudioElement) => {
    const log: { src: string; volume: number; paused: boolean }[] = [];
    Object.assign(window, { t11Transitions: log });
    for (const event of ["volumechange", "pause", "loadstart", "playing"]) {
      audio.addEventListener(event, () => log.push({ src: new URL(audio.src).pathname, volume: audio.volume, paused: audio.paused }));
    }
  });
  let previous = "EA SPORTS FC 27";
  for (const [name, year] of [["FIFA 22", 22], ["FIFA 23", 23], ["EA SPORTS FC 24", 24], ["EA SPORTS FC 25", 25], ["EA SPORTS FC 26", 26], ["EA SPORTS FC 27", 27]] as const) {
    await choose(page, previous, name);
    await expect.poll(async () => (await state(page)).src).toBe(`/audio/fifa${year}.mp3`);
    await expect(player(page).getByRole("status")).toContainText("Playing");
    await expect.poll(async () => (await state(page)).volume).toBe(.15);
    previous = name;
  }
  await choose(page, previous, "All editions");
  expect((await state(page)).src).toBe("/audio/fifa27.mp3");
  await expect(page.locator("audio")).toHaveCount(1);
  const log = await page.evaluate(() => (window as unknown as { t11Transitions: { src: string; volume: number; paused: boolean }[] }).t11Transitions);
  expect(log.some(event => event.volume > 0 && event.volume < .15)).toBe(true);
  expect(log.some(event => event.volume === 0 && event.paused)).toBe(true);
});

test("T11: blocked autoplay offers one explicit native-play fallback", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    let blocked = false;
    HTMLMediaElement.prototype.play = function () {
      if (!blocked) { blocked = true; return Promise.reject(new DOMException("Test autoplay policy", "NotAllowedError")); }
      return original.call(this);
    };
  });
  await page.goto("/");
  await expect(player(page).getByRole("status")).toContainText("Select Play music");
  expect((await state(page)).paused).toBe(true);
  await player(page).getByRole("button", { name: "Play music" }).click();
  await expect(player(page).getByRole("status")).toContainText("Playing");
});

test("T11: a deliberate pause during an edition fade still completes the selected source change", async ({ page }) => {
  await page.goto("/");
  await start(page);
  await choose(page, "EA SPORTS FC 27", "FIFA 22");
  // The outgoing track is still playing during the fade; pause must not cancel
  // selection of the new edition or permit that track to restart.
  const pause = player(page).getByRole("button", { name: "Pause music" });
  await pause.click();
  await expect.poll(async () => (await state(page)).src).toBe("/audio/fifa22.mp3");
  await expect(player(page).getByRole("status")).toContainText("Paused");
  expect((await state(page)).paused).toBe(true);
  await choose(page, "FIFA 22", "FIFA 23");
  await choose(page, "FIFA 23", "All editions");
  await expect.poll(async () => (await state(page)).src).toBe("/audio/fifa23.mp3");
  expect((await state(page)).paused).toBe(true);
});

test("T11: automatic background pause resumes, deliberate pause does not", async ({ page }) => {
  await page.goto("/");
  await start(page);
  await visibility(page, true);
  await expect(player(page).getByRole("status")).toContainText("background");
  expect((await state(page)).paused).toBe(true);
  await visibility(page, false);
  await expect(player(page).getByRole("status")).toContainText("Playing");
  await player(page).getByRole("button", { name: "Pause music" }).click();
  await visibility(page, true);
  await visibility(page, false);
  expect((await state(page)).paused).toBe(true);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("matchday.audio.v1")!));
  expect(saved.paused).toBe(true);
});

for (const failure of ["missing", "invalid"] as const) {
  test(`T11: ${failure} media stays quiet without retrying or blocking the dashboard`, async ({ page }) => {
    let requests = 0;
    await page.route("**/audio/*.mp3", route => {
      requests++;
      return route.fulfill(failure === "missing" ? { status: 404, body: "" } : { contentType: "audio/mpeg", body: "invalid media" });
    });
    await page.goto("/");
    await expect(player(page).getByRole("status")).toHaveText("Music unavailable");
    expect((await state(page)).paused).toBe(true);
    await expect(player(page).getByRole("button", { name: "Play music" })).toBeDisabled();
    const settled = requests;
    await visibility(page, true);
    await visibility(page, false);
    await page.waitForTimeout(500);
    expect(requests).toBe(settled);
    await choose(page, "EA SPORTS FC 27", "FIFA 22");
    await expect(player(page)).toContainText("FIFA 22 soundtrack");
  });
}
