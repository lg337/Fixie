let crmData = [];

export const addToCRM = (entry) => {
  crmData.unshift({
    id: Date.now().toString(),
    ...entry,
  });
};

export const getCRM = () => crmData;