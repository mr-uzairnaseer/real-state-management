import {
  idbGet,
  idbSet,
  mediaKey,
  receiptKey,
  docKey,
} from './idb';

export async function loadAllBlobs(state: {
  media: { id: string; dataUrl: string }[];
  expenses: { id: string; receiptDataUrl?: string }[];
  units: { id: string; documents: { id: string; dataUrl: string }[] }[];
}) {
  const media = await Promise.all(
    state.media.map(async (m) => {
      if (m.dataUrl) {
        await idbSet(mediaKey(m.id), m.dataUrl);
        return m;
      }
      const dataUrl = (await idbGet(mediaKey(m.id))) ?? '';
      return { ...m, dataUrl };
    }),
  );

  const expenses = await Promise.all(
    state.expenses.map(async (e) => {
      if (e.receiptDataUrl) {
        await idbSet(receiptKey(e.id), e.receiptDataUrl);
        return e;
      }
      const receiptDataUrl = (await idbGet(receiptKey(e.id))) ?? undefined;
      return { ...e, receiptDataUrl };
    }),
  );

  const units = await Promise.all(
    state.units.map(async (u) => {
      const documents = await Promise.all(
        u.documents.map(async (d) => {
          if (d.dataUrl) {
            await idbSet(docKey(u.id, d.id), d.dataUrl);
            return d;
          }
          const dataUrl = (await idbGet(docKey(u.id, d.id))) ?? '';
          return { ...d, dataUrl };
        }),
      );
      return { ...u, documents };
    }),
  );

  return { media, expenses, units };
}
