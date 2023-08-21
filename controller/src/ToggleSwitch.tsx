import React, { useState } from 'react';
import s from './ToggleSwitch.module.css';

export type ToggleProps = { on: boolean, onClick?: () => void };
export default function Toggle(props: ToggleProps) {
    return (
      <label className={s.label}>
        <input type="checkbox" className={s.input} checked={props.on} onChange={props.onClick} />
        <span className={s.span}></span>
      </label>
    );
  }
  