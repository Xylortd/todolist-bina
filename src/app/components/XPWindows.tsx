// components/XPWindow.tsx
import React from 'react';

type XPWindowProps = {
  title: string;
  children: React.ReactNode;
};

export default function XPWindow({ title, children }: XPWindowProps) {
  return (
    <div
      className="border"
      style={{
        borderColor: '#000080',
        borderWidth: '4px',
        backgroundColor: '#c0c0c0',
        boxShadow: 'inset -2px -2px 0px #fff, inset 2px 2px 0px #808080',
        fontFamily: 'Tahoma, sans-serif',
        color: 'black',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(to right, #1d5fbf, #3a6ea5)',
          color: 'white',
          padding: '4px 10px',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #000080',
        }}
      >
        <span>{title}</span>
        <span style={{ fontWeight: 'normal' }}>🗙</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
