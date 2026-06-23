const Crop = require('../models/Crop');
const Farm = require('../models/Farm');
const Field = require('../models/Field');
const logEvent = require('../utils/logger');

const lifecycleDurationDays = 120;

const normalizeLifecycleDate = (date) => {
  if (!date) {
    return undefined;
  }

  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
};

const calculateExpectedHarvestDate = (plantingDate, durationDays = lifecycleDurationDays) => {
  const parsedDate = normalizeLifecycleDate(plantingDate);

  if (!parsedDate) {
    return undefined;
  }

  parsedDate.setDate(
    parsedDate.getDate() + (Number(durationDays) || lifecycleDurationDays)
  );
  return parsedDate;
};

const lifecycleStages = [
  'Planning',
  'Land Preparation',
  'Planting',
  'Vegetative Growth',
  'Flowering',
  'Ripening',
  'Harvest'
];

const requiresPlantingDateForStage = (stage) => {
  return lifecycleStages.indexOf(stage) >=
    lifecycleStages.indexOf('Planting');
};

const createPlantingDateError = () => {
  const error = new Error('Planting date is required for this crop stage.');
  error.statusCode = 400;
  return error;
};

const defaultGrowthStages = (totalDays) => {
  const ranges = [
    ['Planning', 0, 8],
    ['Land Preparation', 9, 18],
    ['Planting', 19, 28],
    ['Vegetative Growth', 29, Math.round(totalDays * 0.55)],
    ['Flowering', Math.round(totalDays * 0.55) + 1, Math.round(totalDays * 0.75)],
    ['Ripening', Math.round(totalDays * 0.75) + 1, totalDays - 10],
    ['Harvest', Math.max(totalDays - 9, 1), totalDays]
  ];

  return ranges.map(([name, startDay, endDay]) => ({
    name,
    startDay: Math.max(Number(startDay), 0),
    endDay: Math.max(Number(endDay), Number(startDay))
  }));
};

const createDefaultCrop = ({
  name,
  type,
  lifecycleDays,
  ndviTarget,
  moistureTarget,
  optimalTemperatureMin,
  optimalTemperatureMax,
  expectedYield,
  plantingSeason,
  description,
  icon
}) => ({
  name,
  type,
  icon,
  season: plantingSeason,
  status: 'Active',
  lifecycleDays,
  ndviTarget,
  moistureTarget,
  optimalTemperatureMin,
  optimalTemperatureMax,
  expectedYield,
  plantingSeason,
  description,
  growthStages: defaultGrowthStages(lifecycleDays),
  isDefaultTemplate: true
});

const defaultCropTemplates = [
  createDefaultCrop({ name: 'Corn', type: 'Cereal', lifecycleDays: 120, ndviTarget: 0.75, moistureTarget: 55, optimalTemperatureMin: 18, optimalTemperatureMax: 28, expectedYield: '8 - 12 ton/ha', plantingSeason: 'Spring, Summer', icon: '🌽', description: 'Corn is a versatile cereal crop used for food, feed, and industrial production.' }),
  createDefaultCrop({ name: 'Wheat', type: 'Cereal', lifecycleDays: 110, ndviTarget: 0.70, moistureTarget: 50, optimalTemperatureMin: 12, optimalTemperatureMax: 24, expectedYield: '3 - 6 ton/ha', plantingSeason: 'Autumn, Winter', icon: '🌾', description: 'Wheat is a staple cereal crop with strong performance in temperate growing seasons.' }),
  createDefaultCrop({ name: 'Rice', type: 'Cereal', lifecycleDays: 130, ndviTarget: 0.68, moistureTarget: 70, optimalTemperatureMin: 22, optimalTemperatureMax: 32, expectedYield: '5 - 8 ton/ha', plantingSeason: 'Spring, Summer', icon: '🌾', description: 'Rice is a water-intensive cereal crop that performs best in warm, saturated field conditions.' }),
  createDefaultCrop({ name: 'Barley', type: 'Cereal', lifecycleDays: 95, ndviTarget: 0.66, moistureTarget: 45, optimalTemperatureMin: 8, optimalTemperatureMax: 22, expectedYield: '3 - 5 ton/ha', plantingSeason: 'Autumn, Spring', icon: '🌾', description: 'Barley is a cool-season cereal often used for feed, malt, and rotational cropping.' }),
  createDefaultCrop({ name: 'Oats', type: 'Cereal', lifecycleDays: 100, ndviTarget: 0.64, moistureTarget: 50, optimalTemperatureMin: 10, optimalTemperatureMax: 24, expectedYield: '2.5 - 4.5 ton/ha', plantingSeason: 'Spring, Autumn', icon: '🌾', description: 'Oats are a resilient cool-season cereal used for grain, forage, and cover cropping.' }),
  createDefaultCrop({ name: 'Rye', type: 'Cereal', lifecycleDays: 115, ndviTarget: 0.65, moistureTarget: 45, optimalTemperatureMin: 6, optimalTemperatureMax: 22, expectedYield: '2 - 4 ton/ha', plantingSeason: 'Autumn, Winter', icon: '🌾', description: 'Rye is a hardy cereal crop valued for cold tolerance and soil protection.' }),
  createDefaultCrop({ name: 'Sorghum', type: 'Cereal', lifecycleDays: 115, ndviTarget: 0.68, moistureTarget: 40, optimalTemperatureMin: 20, optimalTemperatureMax: 34, expectedYield: '4 - 7 ton/ha', plantingSeason: 'Spring, Summer', icon: '🌾', description: 'Sorghum is a drought-tolerant cereal used for grain, forage, and bioenergy systems.' }),

  createDefaultCrop({ name: 'Soybean', type: 'Legume', lifecycleDays: 100, ndviTarget: 0.65, moistureTarget: 55, optimalTemperatureMin: 18, optimalTemperatureMax: 30, expectedYield: '2 - 4 ton/ha', plantingSeason: 'Spring, Summer', icon: '🫘', description: 'Soybean is a nitrogen-fixing legume used for oil, protein, and livestock feed.' }),
  createDefaultCrop({ name: 'Peas', type: 'Legume', lifecycleDays: 85, ndviTarget: 0.62, moistureTarget: 55, optimalTemperatureMin: 10, optimalTemperatureMax: 23, expectedYield: '2 - 4 ton/ha', plantingSeason: 'Spring, Autumn', icon: '🫛', description: 'Peas are a cool-season legume suited for fresh markets, processing, and rotations.' }),
  createDefaultCrop({ name: 'Lentils', type: 'Legume', lifecycleDays: 100, ndviTarget: 0.60, moistureTarget: 40, optimalTemperatureMin: 12, optimalTemperatureMax: 27, expectedYield: '1 - 2.5 ton/ha', plantingSeason: 'Spring', icon: '🫘', description: 'Lentils are a pulse crop adapted to dryland systems with modest moisture demand.' }),
  createDefaultCrop({ name: 'Chickpeas', type: 'Legume', lifecycleDays: 105, ndviTarget: 0.61, moistureTarget: 42, optimalTemperatureMin: 15, optimalTemperatureMax: 30, expectedYield: '1.5 - 3 ton/ha', plantingSeason: 'Spring', icon: '🫘', description: 'Chickpeas are a warm-season pulse crop that benefits from well-drained soils.' }),
  createDefaultCrop({ name: 'Beans', type: 'Legume', lifecycleDays: 90, ndviTarget: 0.63, moistureTarget: 55, optimalTemperatureMin: 16, optimalTemperatureMax: 29, expectedYield: '1.5 - 3.5 ton/ha', plantingSeason: 'Spring, Summer', icon: '🫘', description: 'Beans are a short-cycle legume crop requiring balanced moisture and disease monitoring.' }),

  createDefaultCrop({ name: 'Grapes', type: 'Fruit Crop', lifecycleDays: 180, ndviTarget: 0.64, moistureTarget: 50, optimalTemperatureMin: 15, optimalTemperatureMax: 30, expectedYield: '8 - 15 ton/ha', plantingSeason: 'Spring, Summer', icon: '🍇', description: 'Grapes are a vineyard crop used for fresh fruit, raisins, juice, and wine.' }),
  createDefaultCrop({ name: 'Apples', type: 'Fruit Crop', lifecycleDays: 210, ndviTarget: 0.66, moistureTarget: 55, optimalTemperatureMin: 12, optimalTemperatureMax: 26, expectedYield: '25 - 50 ton/ha', plantingSeason: 'Spring', icon: '🍎', description: 'Apples are a perennial orchard crop requiring chill hours, pruning, and pest monitoring.' }),
  createDefaultCrop({ name: 'Oranges', type: 'Fruit Crop', lifecycleDays: 240, ndviTarget: 0.68, moistureTarget: 58, optimalTemperatureMin: 18, optimalTemperatureMax: 32, expectedYield: '20 - 40 ton/ha', plantingSeason: 'Spring, Year-round', icon: '🍊', description: 'Oranges are a citrus crop that prefers warm conditions and consistent moisture.' }),
  createDefaultCrop({ name: 'Lemons', type: 'Fruit Crop', lifecycleDays: 220, ndviTarget: 0.67, moistureTarget: 55, optimalTemperatureMin: 16, optimalTemperatureMax: 30, expectedYield: '18 - 35 ton/ha', plantingSeason: 'Spring, Year-round', icon: '🍋', description: 'Lemons are a citrus crop with multiple harvest windows in suitable climates.' }),
  createDefaultCrop({ name: 'Avocado', type: 'Fruit Crop', lifecycleDays: 300, ndviTarget: 0.70, moistureTarget: 60, optimalTemperatureMin: 16, optimalTemperatureMax: 28, expectedYield: '7 - 15 ton/ha', plantingSeason: 'Spring, Rainy season', icon: '🥑', description: 'Avocado is a perennial fruit crop requiring careful water management and frost avoidance.' }),
  createDefaultCrop({ name: 'Banana', type: 'Fruit Crop', lifecycleDays: 300, ndviTarget: 0.76, moistureTarget: 70, optimalTemperatureMin: 22, optimalTemperatureMax: 32, expectedYield: '30 - 60 ton/ha', plantingSeason: 'Year-round', icon: '🍌', description: 'Banana is a tropical fruit crop with high moisture and nutrient requirements.' }),
  createDefaultCrop({ name: 'Mango', type: 'Fruit Crop', lifecycleDays: 240, ndviTarget: 0.68, moistureTarget: 52, optimalTemperatureMin: 20, optimalTemperatureMax: 34, expectedYield: '8 - 20 ton/ha', plantingSeason: 'Spring, Dry season', icon: '🥭', description: 'Mango is a tropical tree crop that benefits from dry flowering periods and warm weather.' }),
  createDefaultCrop({ name: 'Strawberry', type: 'Fruit Crop', lifecycleDays: 90, ndviTarget: 0.67, moistureTarget: 60, optimalTemperatureMin: 12, optimalTemperatureMax: 26, expectedYield: '20 - 45 ton/ha', plantingSeason: 'Autumn, Spring', icon: '🍓', description: 'Strawberry is a high-value fruit crop requiring precise irrigation and disease control.' }),
  createDefaultCrop({ name: 'Pineapple', type: 'Fruit Crop', lifecycleDays: 420, ndviTarget: 0.72, moistureTarget: 55, optimalTemperatureMin: 20, optimalTemperatureMax: 32, expectedYield: '45 - 75 ton/ha', plantingSeason: 'Year-round', icon: '🍍', description: 'Pineapple is a long-cycle tropical fruit crop with moderate water demand.' }),

  createDefaultCrop({ name: 'Tomato', type: 'Vegetable', lifecycleDays: 90, ndviTarget: 0.70, moistureTarget: 60, optimalTemperatureMin: 18, optimalTemperatureMax: 30, expectedYield: '40 - 80 ton/ha', plantingSeason: 'Spring, Summer', icon: '🍅', description: 'Tomato is a high-value vegetable crop requiring consistent irrigation and nutrition.' }),
  createDefaultCrop({ name: 'Potato', type: 'Vegetable', lifecycleDays: 105, ndviTarget: 0.70, moistureTarget: 55, optimalTemperatureMin: 10, optimalTemperatureMax: 24, expectedYield: '20 - 45 ton/ha', plantingSeason: 'Spring, Autumn', icon: '🥔', description: 'Potato is a root crop requiring well-managed soil moisture and disease monitoring.' }),
  createDefaultCrop({ name: 'Onion', type: 'Vegetable', lifecycleDays: 120, ndviTarget: 0.62, moistureTarget: 50, optimalTemperatureMin: 12, optimalTemperatureMax: 28, expectedYield: '25 - 50 ton/ha', plantingSeason: 'Spring, Autumn', icon: '🧅', description: 'Onion is a bulb vegetable sensitive to water stress during bulb formation.' }),
  createDefaultCrop({ name: 'Carrot', type: 'Vegetable', lifecycleDays: 95, ndviTarget: 0.63, moistureTarget: 55, optimalTemperatureMin: 10, optimalTemperatureMax: 25, expectedYield: '25 - 60 ton/ha', plantingSeason: 'Spring, Autumn', icon: '🥕', description: 'Carrot is a root vegetable that performs best in loose soils with steady moisture.' }),
  createDefaultCrop({ name: 'Lettuce', type: 'Vegetable', lifecycleDays: 55, ndviTarget: 0.58, moistureTarget: 65, optimalTemperatureMin: 8, optimalTemperatureMax: 22, expectedYield: '15 - 30 ton/ha', plantingSeason: 'Spring, Autumn', icon: '🥬', description: 'Lettuce is a short-cycle leafy vegetable requiring cool temperatures and frequent irrigation.' }),
  createDefaultCrop({ name: 'Cucumber', type: 'Vegetable', lifecycleDays: 65, ndviTarget: 0.66, moistureTarget: 65, optimalTemperatureMin: 18, optimalTemperatureMax: 30, expectedYield: '30 - 70 ton/ha', plantingSeason: 'Spring, Summer', icon: '🥒', description: 'Cucumber is a fast-growing vegetable crop with high water demand during fruiting.' }),
  createDefaultCrop({ name: 'Bell Pepper', type: 'Vegetable', lifecycleDays: 95, ndviTarget: 0.68, moistureTarget: 60, optimalTemperatureMin: 18, optimalTemperatureMax: 30, expectedYield: '25 - 50 ton/ha', plantingSeason: 'Spring, Summer', icon: '🫑', description: 'Bell pepper is a warm-season vegetable crop sensitive to temperature extremes.' }),
  createDefaultCrop({ name: 'Broccoli', type: 'Vegetable', lifecycleDays: 80, ndviTarget: 0.64, moistureTarget: 60, optimalTemperatureMin: 10, optimalTemperatureMax: 23, expectedYield: '12 - 25 ton/ha', plantingSeason: 'Spring, Autumn', icon: '🥦', description: 'Broccoli is a cool-season brassica crop requiring consistent growth and nutrition.' }),
  createDefaultCrop({ name: 'Cabbage', type: 'Vegetable', lifecycleDays: 95, ndviTarget: 0.65, moistureTarget: 60, optimalTemperatureMin: 10, optimalTemperatureMax: 24, expectedYield: '30 - 70 ton/ha', plantingSeason: 'Spring, Autumn', icon: '🥬', description: 'Cabbage is a brassica crop that benefits from cool weather and steady soil moisture.' }),

  createDefaultCrop({ name: 'Cotton', type: 'Industrial Crop', lifecycleDays: 150, ndviTarget: 0.60, moistureTarget: 50, optimalTemperatureMin: 20, optimalTemperatureMax: 35, expectedYield: '2 - 4 ton/ha', plantingSeason: 'Spring', icon: '🌿', description: 'Cotton is a fiber crop that requires warm temperatures and careful moisture control.' }),
  createDefaultCrop({ name: 'Sugarcane', type: 'Industrial Crop', lifecycleDays: 365, ndviTarget: 0.80, moistureTarget: 65, optimalTemperatureMin: 20, optimalTemperatureMax: 34, expectedYield: '60 - 100 ton/ha', plantingSeason: 'Year-round', icon: '🎋', description: 'Sugarcane is a long-cycle crop used for sugar, ethanol, and biomass production.' }),
  createDefaultCrop({ name: 'Sunflower', type: 'Industrial Crop', lifecycleDays: 115, ndviTarget: 0.62, moistureTarget: 45, optimalTemperatureMin: 18, optimalTemperatureMax: 28, expectedYield: '1.5 - 3 ton/ha', plantingSeason: 'Spring, Summer', icon: '🌻', description: 'Sunflower is an oilseed crop known for drought tolerance and pollinator value.' }),
  createDefaultCrop({ name: 'Coffee', type: 'Cash Crop', lifecycleDays: 270, ndviTarget: 0.66, moistureTarget: 60, optimalTemperatureMin: 16, optimalTemperatureMax: 26, expectedYield: '1 - 3 ton/ha', plantingSeason: 'Rainy season', icon: '☕', description: 'Coffee is a perennial crop that thrives in stable temperatures and humid conditions.' }),
  createDefaultCrop({ name: 'Cocoa', type: 'Cash Crop', lifecycleDays: 300, ndviTarget: 0.68, moistureTarget: 65, optimalTemperatureMin: 20, optimalTemperatureMax: 30, expectedYield: '0.5 - 1.5 ton/ha', plantingSeason: 'Rainy season', icon: '🍫', description: 'Cocoa is a tropical tree crop that prefers shade, humidity, and stable temperatures.' }),
  createDefaultCrop({ name: 'Tobacco', type: 'Cash Crop', lifecycleDays: 110, ndviTarget: 0.60, moistureTarget: 50, optimalTemperatureMin: 18, optimalTemperatureMax: 30, expectedYield: '1.8 - 3 ton/ha', plantingSeason: 'Spring, Summer', icon: '🌿', description: 'Tobacco is a specialty industrial crop requiring close nutrient and curing management.' }),

  createDefaultCrop({ name: 'Olives', type: 'Tree Crop', lifecycleDays: 240, ndviTarget: 0.58, moistureTarget: 45, optimalTemperatureMin: 12, optimalTemperatureMax: 30, expectedYield: '2 - 6 ton/ha', plantingSeason: 'Spring, Autumn', icon: '🫒', description: 'Olives are a perennial tree crop used for table fruit and oil production.' }),
  createDefaultCrop({ name: 'Almonds', type: 'Tree Crop', lifecycleDays: 220, ndviTarget: 0.62, moistureTarget: 45, optimalTemperatureMin: 12, optimalTemperatureMax: 30, expectedYield: '1.5 - 3 ton/ha', plantingSeason: 'Winter, Spring', icon: '🌰', description: 'Almonds are a tree nut crop requiring chill accumulation and careful bloom management.' }),
  createDefaultCrop({ name: 'Walnuts', type: 'Tree Crop', lifecycleDays: 230, ndviTarget: 0.63, moistureTarget: 50, optimalTemperatureMin: 10, optimalTemperatureMax: 30, expectedYield: '2 - 5 ton/ha', plantingSeason: 'Winter, Spring', icon: '🌰', description: 'Walnuts are a deciduous tree crop requiring deep soils and reliable irrigation.' }),
  createDefaultCrop({ name: 'Pistachios', type: 'Tree Crop', lifecycleDays: 240, ndviTarget: 0.60, moistureTarget: 40, optimalTemperatureMin: 15, optimalTemperatureMax: 35, expectedYield: '1 - 3 ton/ha', plantingSeason: 'Spring', icon: '🌰', description: 'Pistachios are a drought-tolerant tree crop adapted to warm, dry climates.' }),

  createDefaultCrop({ name: 'Tea', type: 'Cash Crop', lifecycleDays: 210, ndviTarget: 0.72, moistureTarget: 65, optimalTemperatureMin: 16, optimalTemperatureMax: 28, expectedYield: '1.5 - 3 ton/ha', plantingSeason: 'Rainy season', icon: '🍃', description: 'Tea is a perennial leaf crop grown in humid climates with frequent harvest cycles.' }),
  createDefaultCrop({ name: 'Canola', type: 'Specialty Crop', lifecycleDays: 110, ndviTarget: 0.66, moistureTarget: 45, optimalTemperatureMin: 8, optimalTemperatureMax: 25, expectedYield: '2 - 4 ton/ha', plantingSeason: 'Autumn, Spring', icon: '🌼', description: 'Canola is an oilseed crop valued for edible oil and rotational benefits.' }),
  createDefaultCrop({ name: 'Cassava', type: 'Specialty Crop', lifecycleDays: 300, ndviTarget: 0.65, moistureTarget: 50, optimalTemperatureMin: 20, optimalTemperatureMax: 32, expectedYield: '15 - 35 ton/ha', plantingSeason: 'Rainy season', icon: '🌱', description: 'Cassava is a drought-tolerant root crop grown widely in tropical production systems.' }),
  createDefaultCrop({ name: 'Quinoa', type: 'Specialty Crop', lifecycleDays: 105, ndviTarget: 0.58, moistureTarget: 35, optimalTemperatureMin: 8, optimalTemperatureMax: 24, expectedYield: '1 - 3 ton/ha', plantingSeason: 'Spring', icon: '🌾', description: 'Quinoa is a resilient grain-like crop adapted to cool and semi-arid conditions.' }),
  createDefaultCrop({ name: 'Flax', type: 'Specialty Crop', lifecycleDays: 100, ndviTarget: 0.60, moistureTarget: 40, optimalTemperatureMin: 10, optimalTemperatureMax: 25, expectedYield: '1 - 2.5 ton/ha', plantingSeason: 'Spring', icon: '🌿', description: 'Flax is a fiber and oilseed crop suited to cool seasons and moderate moisture.' })
];

const seedDefaultCropsForFarms = async (farms) => {
  for (const farm of farms) {
    const existingNames = await Crop.find({
      farm: farm._id,
      name: {
        $in: defaultCropTemplates.map(crop => crop.name)
      }
    }).select('name');

    const existingNameSet =
      new Set(existingNames.map(crop => crop.name.toLowerCase()));

    const cropsToCreate =
      defaultCropTemplates
        .filter(crop => !existingNameSet.has(crop.name.toLowerCase()))
        .map(crop => ({
          ...crop,
          farm: farm._id,
          currentStage: 'Planning',
          stageStartedAt: new Date()
        }));

    if (cropsToCreate.length > 0) {
      await Crop.insertMany(cropsToCreate);
    }

    for (const cropTemplate of defaultCropTemplates) {
      await Crop.updateOne(
        {
          farm: farm._id,
          name: cropTemplate.name,
          isDefaultTemplate: true
        },
        {
          $set: {
            type: cropTemplate.type,
            icon: cropTemplate.icon,
            season: cropTemplate.season,
            lifecycleDays: cropTemplate.lifecycleDays,
            ndviTarget: cropTemplate.ndviTarget,
            moistureTarget: cropTemplate.moistureTarget,
            optimalTemperatureMin: cropTemplate.optimalTemperatureMin,
            optimalTemperatureMax: cropTemplate.optimalTemperatureMax,
            expectedYield: cropTemplate.expectedYield,
            plantingSeason: cropTemplate.plantingSeason,
            description: cropTemplate.description,
            growthStages: cropTemplate.growthStages
          }
        }
      );
    }
  }
};

const applyCropTemplateInput = (crop, body) => {
  crop.status = body.status ?? crop.status;
  crop.icon = body.icon ?? crop.icon;
  crop.lifecycleDays = body.lifecycleDays ?? crop.lifecycleDays;
  crop.ndviTarget = body.ndviTarget ?? crop.ndviTarget;
  crop.moistureTarget = body.moistureTarget ?? crop.moistureTarget;
  crop.optimalTemperatureMin =
    body.optimalTemperatureMin ?? crop.optimalTemperatureMin;
  crop.optimalTemperatureMax =
    body.optimalTemperatureMax ?? crop.optimalTemperatureMax;
  crop.expectedYield = body.expectedYield ?? crop.expectedYield;
  crop.plantingSeason = body.plantingSeason ?? crop.plantingSeason;
  crop.description = body.description ?? crop.description;

  if (Array.isArray(body.growthStages)) {
    crop.growthStages = body.growthStages
      .filter(stage => stage?.name)
      .map(stage => ({
        name: stage.name,
        startDay: Number(stage.startDay) || 0,
        endDay: Number(stage.endDay) || 0
      }));
  }
};

const attachFieldCounts = async (crops) => {
  const cropIds = crops.map(crop => crop._id);
  const fieldCounts = await Field.aggregate([
    {
      $match: {
        crop: {
          $in: cropIds
        }
      }
    },
    {
      $group: {
        _id: '$crop',
        count: {
          $sum: 1
        }
      }
    }
  ]);

  const countMap = new Map(
    fieldCounts.map(item => [item._id.toString(), item.count])
  );

  return crops.map(crop => ({
    ...crop.toObject(),
    fieldsCount: countMap.get(crop._id.toString()) || 0
  }));
};

// Create crop
const createCrop = async (req, res) => {

  try {
    
    const farm = await Farm.findById(req.body.farm);
    
    if (!farm) {
      return res.status(404).json({
        message: 'Farm not found'
      });
    }
    
    // Ownership validation
    if (
      req.user.role !== 'admin' &&
      farm.owner.toString() !== req.user.id
    ) {

      logEvent('warn', 'FORBIDDEN_ACCESS', {
        userId: req.user.id,
        role: req.user.role,
        farmId: farm._id,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip
      });

      return res.status(403).json({
        message: 'Not authorized for this farm'
      });
      
    }
    
    const stage =
      req.body.currentStage || 'Planning';
    const plantingDate =
      normalizeLifecycleDate(req.body.plantingDate) ||
      (req.body.currentStage === 'Planning' ? new Date() : undefined);

    if (
      req.body.currentStage &&
      requiresPlantingDateForStage(stage) &&
      !plantingDate
    ) {
      throw createPlantingDateError();
    }

    const expectedHarvestDate =
      normalizeLifecycleDate(req.body.expectedHarvestDate) ||
      calculateExpectedHarvestDate(plantingDate, req.body.lifecycleDays);

    const cropPayload = {
      name: req.body.name,
      type: req.body.type,
      season: req.body.season,
      farm: req.body.farm,
      currentStage: stage,
      stageStartedAt: req.body.stageStartedAt || new Date(),
      plantingDate,
      expectedHarvestDate
    };

    const crop = new Crop(cropPayload);
    applyCropTemplateInput(crop, req.body);
    await crop.save();
    
    logEvent('info', 'CROP_CREATED', {
      cropId: crop._id,
      cropName: crop.name,
      farmId: farm._id,
      createdBy: req.user.id
    });
    res.status(201).json(crop);
    
  } catch (error) {
    
    res.status(error.statusCode || 500).json({
      message: error.message
    });
    
  }
  
};

// Get crops
const getCrops = async (req, res) => {

  try {

    let crops;
    let farms = [];

    // Admin can see all crops
    if (req.user.role === 'admin') {
      farms = await Farm.find();
      await seedDefaultCropsForFarms(farms);

      crops = await Crop.find()
        .populate({
          path: 'farm',
          populate: {
            path: 'owner',
            select: 'email role'
          }
        });

    } else {

      // Managers only see crops from their farms
      farms = await Farm.find({
        owner: req.user.id
      });

      await seedDefaultCropsForFarms(farms);

      const farmIds = farms.map(farm => farm._id);

      crops = await Crop.find({
        farm: { $in: farmIds }
      }).populate({
        path: 'farm',
        populate: {
          path: 'owner',
          select: 'email role'
        }
      });

    }

    const cropsWithFieldCounts = await attachFieldCounts(crops);

    res.json(cropsWithFieldCounts);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

// Delete crop
const deleteCrop = async (req, res) => {

  try {

    const crop = await Crop.findById(req.params.id)
      .populate('farm');

    if (!crop) {

      return res.status(404).json({
        message: 'Crop not found'
      });

    }

    if (
      req.user.role !== 'admin' &&
      crop.farm.owner.toString() !== req.user.id
    ) {

      logEvent('warn', 'FORBIDDEN_ACCESS', {
        userId: req.user.id,
        role: req.user.role,
        cropId: crop._id,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip
      });

      return res.status(403).json({
        message: 'Not authorized'
      });

    }

    const fieldResult =
      await Field.updateMany(
        { crop: crop._id },
        {
          $set: {
            crop: null
          }
        }
      );

    await crop.deleteOne();

    logEvent('info', 'CROP_DELETED', {
      cropId: crop._id,
      cropName: crop.name,
      deletedBy: req.user.id,
      role: req.user.role,
      detachedFields: fieldResult.modifiedCount || 0
    });

    res.json({
      message: 'Crop deleted successfully',
      detachedFields: fieldResult.modifiedCount || 0
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

// Update crop
const updateCrop = async (req, res) => {

  try {

    const crop = await Crop.findById(req.params.id)
      .populate('farm');

    if (!crop) {

      return res.status(404).json({
        message: 'Crop not found'
      });

    }

    if (
      req.user.role !== 'admin' &&
      crop.farm.owner.toString() !== req.user.id
    ) {

      logEvent('warn', 'FORBIDDEN_ACCESS', {
        userId: req.user.id,
        role: req.user.role,
        cropId: crop._id,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip
      });

      return res.status(403).json({
        message: 'Not authorized'
      });

    }

    const nextStage =
      req.body.currentStage ?? crop.currentStage;
    const stageChanged =
      nextStage !== crop.currentStage;
    const plantingDate =
      req.body.plantingDate === undefined
        ? crop.plantingDate
        : normalizeLifecycleDate(req.body.plantingDate);

    if (
      req.body.currentStage &&
      requiresPlantingDateForStage(nextStage) &&
      !plantingDate
    ) {
      throw createPlantingDateError();
    }

    const lifecycleDays =
      req.body.lifecycleDays ?? crop.lifecycleDays ?? lifecycleDurationDays;

    const lifecycleDaysChanged =
      req.body.lifecycleDays !== undefined &&
      Number(req.body.lifecycleDays) !== Number(crop.lifecycleDays);
    const expectedHarvestDate =
      req.body.expectedHarvestDate === undefined
        ? lifecycleDaysChanged
          ? calculateExpectedHarvestDate(plantingDate, lifecycleDays)
          : crop.expectedHarvestDate || calculateExpectedHarvestDate(plantingDate, lifecycleDays)
        : normalizeLifecycleDate(req.body.expectedHarvestDate) ||
          calculateExpectedHarvestDate(plantingDate, lifecycleDays);

    crop.name = req.body.name ?? crop.name;
    crop.type = req.body.type ?? crop.type;
    crop.season = req.body.season ?? crop.season;
    crop.currentStage = nextStage;
    crop.stageStartedAt = req.body.stageStartedAt ??
      (stageChanged ? new Date() : crop.stageStartedAt);
    crop.plantingDate = plantingDate;
    crop.expectedHarvestDate = expectedHarvestDate;
    applyCropTemplateInput(crop, req.body);

    await crop.save();

    logEvent('info', 'CROP_UPDATED', {
      cropId: crop._id,
      cropName: crop.name,
      updatedBy: req.user.id,
      role: req.user.role
    });

    res.json(crop);

  } catch (error) {

    res.status(error.statusCode || 500).json({
      message: error.message
    });

  }

};

module.exports = {
  createCrop,
  getCrops,
  deleteCrop,
  updateCrop
};
