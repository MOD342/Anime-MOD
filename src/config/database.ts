import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri || (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://'))) {
      console.warn('⚠️ تنبيه: MONGODB_URI غير متوفر أو غير صالح في المتغيرات البيئية. تم تخطي الاتصال بقاعدة البيانات.');
      return;
    }
    
    // إعدادات Mongoose الافتراضية
    mongoose.set('strictQuery', true);
    
    await mongoose.connect(uri);
    console.log('✅ تم الاتصال بقاعدة بيانات MongoDB بنجاح.');
  } catch (error) {
    console.error('❌ خطأ في الاتصال بقاعدة بيانات MongoDB:', error);
    // لن نوقف الخادم في بيئة التطوير، فقط سنسجل الخطأ
  }
};
