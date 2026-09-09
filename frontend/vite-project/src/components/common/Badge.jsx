
const mapStatusToColor = (status) => {
  const s = status.toUpperCase();
  if (['OPEN', 'SAFE', 'COMPLETED', 'NORMAL'].includes(s)) return 'success';
  if (['CAUTION', 'WARNING', 'DELAYED', 'HIGH'].includes(s)) return 'warning';
  if (['BLOCKED', 'CRITICAL', 'HIGH RISK', 'DANGER'].includes(s)) return 'danger';
  return 'info';
};

export const Badge = ({ children, type }) => {
  const colorType = type || mapStatusToColor(children);
  return (
    <span className={`badge ${colorType}`}>
      {children}
    </span>
  );
};