// @ts-check
import { describe, it, expect } from 'vitest';
import { judgeTemp, judgeStage, formatStageZones, EGGPLANT_TEMP_ZONES_SAMPLE as Z, CARROT_TEMP_ZONES_SAMPLE as C } from '../../hatake_files_v24/js/temp-zones.js';

describe('judgeTemp', () => {
  const zone = { optMin: 20, optMax: 30 };
  it('適温の範囲の両端は適温', () => {
    expect(judgeTemp(20, zone)).toBe('optimal');
    expect(judgeTemp(30, zone)).toBe('optimal');
  });
  it('範囲の外は低め/高め', () => {
    expect(judgeTemp(19.9, zone)).toBe('low');
    expect(judgeTemp(30.1, zone)).toBe('high');
  });
});

describe('judgeStage（ナス）', () => {
  it('生育：日平均が範囲内なら適温', () => {
    expect(judgeStage(Z.growth, { max: 28, min: 18 })).toEqual({ level: 'optimal', mean: 23 });
  });
  it('生育：日平均が上回れば高め、下回れば低め', () => {
    expect(judgeStage(Z.growth, { max: 34, min: 29 })?.level).toBe('high');
    expect(judgeStage(Z.growth, { max: 22, min: 14 })?.level).toBe('low');
  });
  it('生育：昼の最高が35℃を超えたら、日平均が適温でも障害域（高温）', () => {
    expect(judgeStage(Z.growth, { max: 36, min: 20 })?.level).toBe('danger-high');
    expect(judgeStage(Z.growth, { max: 35, min: 20 })?.level).toBe('optimal'); // 35℃ちょうどは障害域にしない（日平均27.5℃）
  });
  it('生育：夜の最低が10℃を下回ったら障害域（低温）、ちょうど10℃は低め', () => {
    expect(judgeStage(Z.growth, { max: 25, min: 9 })?.level).toBe('danger-low');
    expect(judgeStage(Z.growth, { max: 25, min: 10 })?.level).toBe('low');
  });
  it('生育：昼と夜がともに限界を越えたら昼（高温側）を優先する', () => {
    expect(judgeStage(Z.growth, { max: 38, min: 8 })?.level).toBe('danger-high');
  });
  it('発芽：limitが無いので障害域にならず、3段階で判定する', () => {
    expect(judgeStage(Z.germination, { max: 40, min: 5 })?.level).toBe('optimal'); // 日平均22.5
    expect(judgeStage(Z.germination, { max: 12, min: 2 })?.level).toBe('low');
    expect(judgeStage(Z.germination, { max: 45, min: 25 })?.level).toBe('high');
  });
  it('範囲を持たないステージはnull', () => {
    expect(judgeStage(undefined, { max: 25, min: 15 })).toBeNull();
  });
});

describe('formatStageZones（ナス）', () => {
  it('生育：適温と障害域を1文にする', () => {
    expect(formatStageZones(Z.growth)).toBe('日平均20〜30℃が適温（昼35℃超・夜10℃未満は障害域）');
  });
  it('発芽：限界が無ければ適温だけ', () => {
    expect(formatStageZones(Z.germination)).toBe('日平均20〜30℃が適温');
  });
  it('範囲が無ければ空文字', () => {
    expect(formatStageZones(undefined)).toBe('');
  });
});

describe('judgeStage（ニンジン・発芽できる範囲）', () => {
  it('適温(15〜25℃)の中なら適温', () => {
    expect(judgeStage(C.germination, { max: 24, min: 14 })?.level).toBe('optimal'); // 日平均19
  });
  it('適温の外でも、発芽できる範囲(8〜30℃)の中なら低め/高め（時間はかかるが発芽する）', () => {
    expect(judgeStage(C.germination, { max: 14, min: 6 })?.level).toBe('low'); // 日平均10
    expect(judgeStage(C.germination, { max: 32, min: 24 })?.level).toBe('high'); // 日平均28
  });
  it('発芽できる範囲の外は障害域（日平均8℃未満・30℃超、ちょうどは範囲内）', () => {
    expect(judgeStage(C.germination, { max: 9, min: 5 })?.level).toBe('danger-low'); // 日平均7
    expect(judgeStage(C.germination, { max: 10, min: 6 })?.level).toBe('low'); // 日平均8
    expect(judgeStage(C.germination, { max: 36, min: 26 })?.level).toBe('danger-high'); // 日平均31
    expect(judgeStage(C.germination, { max: 34, min: 26 })?.level).toBe('high'); // 日平均30
  });
  it('生育：limitが無いので障害域にならない', () => {
    expect(judgeStage(C.growth, { max: 5, min: -5 })?.level).toBe('low');
  });
});

describe('formatStageZones（ニンジン）', () => {
  it('発芽：適温と、発芽できる範囲の外を障害域として1文にする', () => {
    expect(formatStageZones(C.germination)).toBe('日平均15〜25℃が適温（日平均8℃未満・日平均30℃超は障害域）');
  });
  it('生育：適温だけ', () => {
    expect(formatStageZones(C.growth)).toBe('日平均15〜25℃が適温');
  });
});
