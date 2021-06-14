import React, { FC } from 'react';
import Tooltip from 'rc-tooltip';
import 'rc-tooltip/assets/bootstrap.css';

const SVGWrapper: FC<{ label: string; handleClick?: () => void }> = ({ label, handleClick, children }) => {
  return (
    <Tooltip
      placement="top"
      mouseEnterDelay={0}
      mouseLeaveDelay={0.1}
      destroyTooltipOnHide={false}
      trigger={['hover']}
      overlay={<div>{label}</div>}
      align={{
        offset: [0, -4],
      }}
    >
      <div onClick={handleClick}>
        <div
          style={{
            background: '#fff',
            borderRadius: 3,
            border: '1px solid #ccc',
            padding: '0 3px 0 3px',
            cursor: 'pointer',
          }}
        >
          {children}
        </div>
      </div>
    </Tooltip>
  );
};
export default SVGWrapper;
