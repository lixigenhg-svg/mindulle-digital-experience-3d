import { describe, expect, it, beforeEach } from 'vitest';
import { ActionMachine, type ActionEvent } from '../src/actions';

describe('礼佛动作状态机', () => {
  let events: ActionEvent[];
  let machine: ActionMachine;

  beforeEach(() => {
    events = [];
    machine = new ActionMachine(ev => events.push(ev));
  });

  it('初始 idle，不锁位移', () => {
    expect(machine.state).toBe('idle');
    expect(machine.moveLock()).toBe('none');
    expect(machine.isActive()).toBe(false);
  });

  it('合掌进入 praying，1.5s 后自动回 idle', () => {
    machine.pray();
    expect(machine.state).toBe('praying');
    expect(events).toContain('pray');
    machine.update(performance.now() + 1600);
    expect(machine.state).toBe('idle');
  });

  it('跪拜是开关动作，并锁全部位移', () => {
    machine.toggleBow();
    expect(machine.state).toBe('bowing');
    expect(machine.moveLock()).toBe('all');
    machine.toggleBow();
    expect(machine.state).toBe('idle');
    expect(events).toEqual(['bow_start', 'bow_stop']);
  });

  it('木鱼 0.7s 后自动回收', () => {
    machine.woodfish();
    expect(machine.state).toBe('woodfish');
    expect(events).toContain('woodfish');
    machine.update(performance.now() + 800);
    expect(machine.state).toBe('idle');
  });

  it('念珠按住锁前后移动、允许转身，松开回 idle', () => {
    machine.setBeadsHold(true);
    expect(machine.state).toBe('beads');
    expect(machine.moveLock()).toBe('translate');
    machine.setBeadsHold(false);
    expect(machine.state).toBe('idle');
    expect(events).toEqual(['beads_start', 'beads_stop']);
  });

  it('移动打断跪拜时补发 bow_stop', () => {
    machine.toggleBow();
    machine.interruptByMove();
    expect(machine.state).toBe('idle');
    expect(events).toEqual(['bow_start', 'bow_stop']);
  });

  it('移动打断念珠时补发 beads_stop', () => {
    machine.setBeadsHold(true);
    machine.interruptByMove();
    expect(machine.state).toBe('idle');
    expect(events).toEqual(['beads_start', 'beads_stop']);
  });

  it('同一时间只有一个主动作，合掌可覆盖念珠', () => {
    machine.setBeadsHold(true);
    machine.pray();
    expect(machine.state).toBe('praying');
  });
});
