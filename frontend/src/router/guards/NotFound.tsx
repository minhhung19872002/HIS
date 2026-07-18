import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HttpError } from '../../components/shared/HttpError';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <HttpError
      code={404}
      onBack={() => navigate(-1)}
    />
  );
};

export default NotFound;
