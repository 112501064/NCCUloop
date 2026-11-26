import { useState, useEffect } from 'react';
import { Language } from '../types';
import {
  containsChinese,
  getCachedTranslation,
  translateTextToEnglish,
} from '../utils/formatters';
import { localizeLocationName } from '../utils/lbs';

/**
 * Automatically translates Chinese dynamic text to English when `lang === 'en'`,
 * backed by synchronous memory + localStorage cache (zero flicker on repeat renders)
 * and restores the original text immediately when toggled back to `lang === 'zh'`.
 */
export function useAutoTranslateText(
  text: string | undefined,
  lang: Language,
  preTranslatedEn?: string
): string {
  const source = text || '';
  const hasValidPre =
    Boolean(preTranslatedEn && preTranslatedEn.trim() && !containsChinese(preTranslatedEn));

  const getImmediateValue = (): string => {
    if (lang === 'zh') return source;
    if (hasValidPre && preTranslatedEn) return preTranslatedEn;
    if (!source || !containsChinese(source)) return source;
    return getCachedTranslation(source) || source;
  };

  const [displayText, setDisplayText] = useState<string>(getImmediateValue);

  useEffect(() => {
    if (lang === 'zh') {
      setDisplayText(source);
      return;
    }
    if (hasValidPre && preTranslatedEn) {
      setDisplayText(preTranslatedEn);
      return;
    }
    if (!source || !containsChinese(source)) {
      setDisplayText(source);
      return;
    }

    const cached = getCachedTranslation(source);
    if (cached) {
      setDisplayText(cached);
      return;
    }

    let cancelled = false;
    setDisplayText(source);
    void translateTextToEnglish(source).then((translated) => {
      if (!cancelled && translated) {
        setDisplayText(translated);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [source, lang, hasValidPre, preTranslatedEn]);

  return displayText;
}

/**
 * Resolves a campus location using the built-in bilingual dictionary first,
 * and falls back to automatic translation for custom user-entered Chinese locations.
 */
export function useAutoTranslateLocation(
  locationZh: string,
  lang: Language,
  fallbackEn?: string
): string {
  const dictResolved = localizeLocationName(locationZh, lang, fallbackEn);
  return useAutoTranslateText(dictResolved, lang);
}

/**
 * Translates an array of tags/skills automatically when `lang === 'en'`.
 */
export function useAutoTranslateArray(items: string[], lang: Language): string[] {
  const serialized = items.join('\u0001');

  const getImmediateList = (): string[] => {
    if (lang === 'zh') return items;
    return items.map((item) => {
      if (!containsChinese(item)) return item;
      return getCachedTranslation(item) || item;
    });
  };

  const [translatedList, setTranslatedList] = useState<string[]>(getImmediateList);

  useEffect(() => {
    if (lang === 'zh') {
      setTranslatedList(items);
      return;
    }

    const immediate = getImmediateList();
    setTranslatedList(immediate);

    const pendingIndices = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => containsChinese(item) && !getCachedTranslation(item));

    if (pendingIndices.length === 0) return;

    let cancelled = false;
    void Promise.all(
      items.map((item) =>
        containsChinese(item) ? translateTextToEnglish(item) : Promise.resolve(item)
      )
    ).then((res) => {
      if (!cancelled) {
        setTranslatedList(res);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, lang]);

  return translatedList;
}
